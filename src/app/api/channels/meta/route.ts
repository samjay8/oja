import { after, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, type DB } from "@/db";
import { channelConnections, conversations, vendors } from "@/db/schema";
import { runAgentTurn } from "@/lib/agent";
import { baseUrl } from "@/lib/app";
import { deliver } from "@/lib/channels";
import { parseMetaWebhook, verifyMetaSignature, type Inbound } from "@/lib/channels/meta";
import { addMessage, getOrCreateConversation, logEvent, vendorById, vendorBySlug, type Vendor } from "@/lib/commerce";

// Meta's webhook verification handshake (WhatsApp, Messenger and Instagram share it).
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const want = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
  if (want && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === want) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("forbidden", { status: 403 });
}

async function vendorFor(db: DB, m: Inbound): Promise<Vendor | null> {
  const conn = (await db.select().from(channelConnections)
    .where(and(eq(channelConnections.channel, m.channel), eq(channelConnections.externalId, m.externalId), eq(channelConnections.active, true)))
    .limit(1))[0];
  if (conn) return vendorById(db, conn.vendorId);
  if (m.channel !== "whatsapp") return null;
  const byPnid = (await db.select().from(vendors).where(eq(vendors.whatsappPhoneNumberId, m.externalId)).limit(1))[0];
  if (byPnid) return byPnid;
  const slug = process.env.WHATSAPP_VENDOR_SLUG;
  return slug ? vendorBySlug(db, slug) : null;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"))) return new Response("bad signature", { status: 401 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
  const inbound = parseMetaWebhook(body);
  if (!inbound.length) return new Response("ok", { status: 200 });
  const origin = await baseUrl();

  // Acknowledge fast; Meta retries slow webhooks.
  after(async () => {
    const db = await getDb();
    for (const m of inbound) {
      try {
        const vendor = await vendorFor(db, m);
        if (!vendor) { console.warn(`[meta] no vendor for ${m.channel} ${m.externalId}`); continue; }
        const conv = await getOrCreateConversation(db, vendor.id, m.channel, m.senderId, m.senderName);
        const saved = await addMessage(db, conv.id, "buyer", m.text, { externalId: `${m.channel}:${m.messageId}` });
        if (!saved) continue; // duplicate delivery
        let reply;
        try {
          reply = await runAgentTurn(db, vendor, conv, origin);
        } catch (e) {
          console.error(`[meta] ${m.channel} turn failed`, e);
          await db.update(conversations).set({ needsHuman: true }).where(eq(conversations.id, conv.id));
          continue;
        }
        if (reply?.status === "sent") {
          try {
            await deliver(vendor, conv, reply.body);
          } catch (e) {
            // Saved as sent but never reached the buyer: put it in front of the seller.
            console.error(`[meta] ${m.channel} delivery failed`, e instanceof Error ? e.message : e);
            await db.update(conversations).set({ needsHuman: true }).where(eq(conversations.id, conv.id));
            await logEvent(db, { vendorId: vendor.id, conversationId: conv.id, type: "channel.delivery_failed",
              data: { channel: m.channel, message: e instanceof Error ? e.message.slice(0, 200) : "unknown" } });
          }
        }
      } catch (e) {
        console.error(`[meta] ${m.channel} message failed`, e);
      }
    }
  });
  return new Response("ok", { status: 200 });
}
