import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { channelConnections } from "@/db/schema";
import { currentVendor, json } from "@/lib/app";
import { verifyConnection } from "@/lib/channels";
import { allow } from "@/lib/ratelimit";

const Body = z.object({ id: z.string().min(1).max(64) });

export async function POST(req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/channels/test">) {
  const { slug } = await ctx.params;
  const vendor = await currentVendor(slug);
  if (!vendor) return json({ error: "signed out" }, 401);
  if (!allow(`channel-test:${vendor.id}`, 10, 5 * 60_000)) return json({ error: "Too many checks. Try again in a few minutes." }, 429);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad request" }, 400);
  const db = await getDb();
  const row = (await db.select().from(channelConnections)
    .where(and(eq(channelConnections.id, parsed.data.id), eq(channelConnections.vendorId, vendor.id))).limit(1))[0];
  if (!row) return json({ error: "not found" }, 404);
  return json(await verifyConnection(row));
}
