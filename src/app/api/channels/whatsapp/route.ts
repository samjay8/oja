import { after, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { vendors } from "@/db/schema";
import { runAgentTurn } from "@/lib/agent";
import { baseUrl } from "@/lib/app";
import { deliver } from "@/lib/channels";
import { parseInbound, verifySignature } from "@/lib/channels/whatsapp";
import { addMessage, getOrCreateConversation, vendorBySlug } from "@/lib/commerce";

// Meta's webhook verification handshake.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) return new Response("bad signature", { status: 401 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
  const inbound = parseInbound(body as Parameters<typeof parseInbound>[0]);
  const origin = await baseUrl();

  // Acknowledge fast; Meta retries slow webhooks.
  after(async () => {
    const db = await getDb();
    for (const m of inbound) {
      const vendor = (await db.select().from(vendors).where(eq(vendors.whatsappPhoneNumberId, m.phoneNumberId)).limit(1))[0]
        ?? (process.env.WHATSAPP_VENDOR_SLUG ? await vendorBySlug(db, process.env.WHATSAPP_VENDOR_SLUG) : null);
      if (!vendor) { console.warn("[whatsapp] no vendor for", m.phoneNumberId); continue; }
      const conv = await getOrCreateConversation(db, vendor.id, "whatsapp", m.from, m.name);
      const saved = await addMessage(db, conv.id, "buyer", m.text, { externalId: `wa:${m.id}` });
      if (!saved) continue; // duplicate delivery
      try {
        const reply = await runAgentTurn(db, vendor, conv, origin);
        if (reply?.status === "sent") await deliver(vendor, conv, reply.body);
      } catch (e) {
        console.error("[whatsapp] turn failed", e);
      }
    }
  });
  return new Response("ok", { status: 200 });
}
