import type { NextRequest } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { conversations, messages, vendors } from "@/db/schema";
import { runAgentTurn } from "@/lib/agent";
import { baseUrl, json } from "@/lib/app";
import { addMessage, getOrCreateConversation, history, vendorBySlug } from "@/lib/commerce";
import { isLanguage } from "@/lib/languages";
import { allow } from "@/lib/ratelimit";

const Session = z.string().regex(/^[A-Za-z0-9-]{16,64}$/);

function publicMessages(rows: { id: string; role: string; body: string; createdAt: Date }[]) {
  return rows.map((m) => ({ id: m.id, role: m.role, body: m.body, at: m.createdAt }));
}

// Every open chat polls this, so it stays at two small queries: shop + conversation in
// one join, then only the columns the buyer sees. No conversation yet = one query.
export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop") ?? "";
  const session = Session.safeParse(req.nextUrl.searchParams.get("session"));
  if (!session.success) return json({ error: "bad session" }, 400);
  const db = await getDb();
  const [row] = await db
    .select({ convId: conversations.id, needsHuman: conversations.needsHuman, language: conversations.language })
    .from(vendors)
    .leftJoin(conversations, and(
      eq(conversations.vendorId, vendors.id), eq(conversations.channel, "web"), eq(conversations.buyerRef, session.data),
    ))
    .where(eq(vendors.slug, shop))
    .limit(1);
  if (!row) return json({ error: "no such shop" }, 404);
  if (!row.convId) return json({ messages: [], sellerReviewing: false, language: null });
  const all = await db
    .select({ id: messages.id, role: messages.role, body: messages.body, status: messages.status, createdAt: messages.createdAt })
    .from(messages)
    .where(and(eq(messages.conversationId, row.convId), inArray(messages.status, ["sent", "draft"])))
    .orderBy(asc(messages.createdAt));
  return json({
    messages: publicMessages(all.filter((m) => m.status === "sent")),
    sellerReviewing: all.at(-1)?.status === "draft" || (row.needsHuman === true && all.at(-1)?.role === "buyer"),
    language: row.language ?? null,
  });
}

const Body = z.object({
  shop: z.string().max(64),
  session: Session,
  text: z.string().trim().min(1).max(2000),
  language: z.string().refine(isLanguage).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad request" }, 400);
  const { shop, session, text, language } = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allow(`chat:${session}`, 20, 5 * 60_000) || !allow(`chat-ip:${ip}`, 60, 10 * 60_000)) {
    return json({ error: "You're sending messages quickly. Give it a minute." }, 429);
  }

  const db = await getDb();
  const vendor = await vendorBySlug(db, shop);
  if (!vendor) return json({ error: "no such shop" }, 404);
  let conv = await getOrCreateConversation(db, vendor.id, "web", session);
  if (language && isLanguage(language) && conv.language !== language) {
    [conv] = await db.update(conversations).set({ language }).where(eq(conversations.id, conv.id)).returning();
  }
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
    language: conv.language ?? null,
  });
}
