import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { conversations } from "@/db/schema";
import { runAgentTurn } from "@/lib/agent";
import { baseUrl, json } from "@/lib/app";
import { addMessage, findConversation, getOrCreateConversation, history, vendorBySlug } from "@/lib/commerce";
import { allow } from "@/lib/ratelimit";

const Session = z.string().regex(/^[A-Za-z0-9-]{16,64}$/);

function publicMessages(rows: Awaited<ReturnType<typeof history>>) {
  return rows.map((m) => ({ id: m.id, role: m.role, body: m.body, at: m.createdAt }));
}

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop") ?? "";
  const session = Session.safeParse(req.nextUrl.searchParams.get("session"));
  if (!session.success) return json({ error: "bad session" }, 400);
  const db = await getDb();
  const vendor = await vendorBySlug(db, shop);
  if (!vendor) return json({ error: "no such shop" }, 404);
  const conv = await findConversation(db, vendor.id, "web", session.data);
  if (!conv) return json({ messages: [], sellerReviewing: false });
  const all = await history(db, conv.id, { includeDrafts: true });
  return json({
    messages: publicMessages(all.filter((m) => m.status === "sent")),
    sellerReviewing: all.at(-1)?.status === "draft" || (conv.needsHuman && all.at(-1)?.role === "buyer"),
  });
}

const Body = z.object({ shop: z.string().max(64), session: Session, text: z.string().trim().min(1).max(2000) });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad request" }, 400);
  const { shop, session, text } = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allow(`chat:${session}`, 20, 5 * 60_000) || !allow(`chat-ip:${ip}`, 60, 10 * 60_000)) {
    return json({ error: "You're sending messages quickly. Give it a minute." }, 429);
  }

  const db = await getDb();
  const vendor = await vendorBySlug(db, shop);
  if (!vendor) return json({ error: "no such shop" }, 404);
  const conv = await getOrCreateConversation(db, vendor.id, "web", session);
  await addMessage(db, conv.id, "buyer", text);

  let reply = null;
  try {
    reply = await runAgentTurn(db, vendor, conv, await baseUrl());
  } catch (e) {
    // The seller picks it up from the inbox; the buyer sees "reviewing".
    console.error("[chat] agent failed", e);
    await db.update(conversations).set({ needsHuman: true }).where(eq(conversations.id, conv.id));
  }
  const all = await history(db, conv.id, { includeDrafts: true });
  return json({
    messages: publicMessages(all.filter((m) => m.status === "sent")),
    sellerReviewing: reply?.status === "draft" || reply === null,
  });
}
