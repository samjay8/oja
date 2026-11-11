import type { NextRequest } from "next/server";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { conversations, events, messages, orders } from "@/db/schema";
import { currentVendor, json } from "@/lib/app";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/inbox">) {
  const { slug } = await ctx.params;
  const vendor = await currentVendor(slug);
  if (!vendor) return json({ error: "signed out" }, 401);
  const db = await getDb();

  // Polled every few seconds by each open seller dashboard: the three independent reads
  // go out together, then the messages for the listed conversations.
  const [convs, ords, evs] = await Promise.all([
    db.select().from(conversations).where(eq(conversations.vendorId, vendor.id))
      .orderBy(desc(conversations.lastBuyerMessageAt)).limit(50),
    db.select().from(orders).where(eq(orders.vendorId, vendor.id)).orderBy(desc(orders.createdAt)).limit(50),
    db.select().from(events).where(and(eq(events.vendorId, vendor.id), ne(events.type, "agent.turn"))).orderBy(desc(events.createdAt)).limit(30),
  ]);
  const ids = convs.map((c) => c.id);
  const msgs = ids.length
    ? await db.select().from(messages).where(and(inArray(messages.conversationId, ids), ne(messages.status, "discarded"))).orderBy(messages.createdAt)
    : [];

  return json({
    vendor: { name: vendor.name, slug: vendor.slug, currency: vendor.currency, replyMode: vendor.replyMode, paypalVerified: vendor.paypalVerified },
    conversations: convs.map((c) => ({
      ...c,
      messages: msgs.filter((m) => m.conversationId === c.id),
    })),
    orders: ords,
    events: evs,
  });
}
