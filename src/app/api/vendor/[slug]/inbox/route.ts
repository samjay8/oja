import type { NextRequest } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { conversations, events, messages, orders } from "@/db/schema";
import { currentVendor, json } from "@/lib/app";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/inbox">) {
  const { slug } = await ctx.params;
  const vendor = await currentVendor(slug);
  if (!vendor) return json({ error: "signed out" }, 401);
  const db = await getDb();

  const convs = await db.select().from(conversations).where(eq(conversations.vendorId, vendor.id))
    .orderBy(desc(conversations.lastBuyerMessageAt)).limit(50);
  const ids = convs.map((c) => c.id);
  const msgs = ids.length
    ? await db.select().from(messages).where(inArray(messages.conversationId, ids)).orderBy(messages.createdAt)
    : [];
  const ords = await db.select().from(orders).where(eq(orders.vendorId, vendor.id)).orderBy(desc(orders.createdAt)).limit(50);
  const evs = await db.select().from(events).where(eq(events.vendorId, vendor.id)).orderBy(desc(events.createdAt)).limit(30);

  return json({
    vendor: { name: vendor.name, slug: vendor.slug, currency: vendor.currency, replyMode: vendor.replyMode, paypalVerified: vendor.paypalVerified },
    conversations: convs.map((c) => ({
      ...c,
      messages: msgs.filter((m) => m.conversationId === c.id && m.status !== "discarded"),
    })),
    orders: ords,
    events: evs,
  });
}
