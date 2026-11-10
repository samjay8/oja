import type { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { channelConnections } from "@/db/schema";
import { baseUrl, currentVendor, json } from "@/lib/app";
import { logEvent } from "@/lib/commerce";
import { decrypt, encrypt, mask } from "@/lib/crypto";
import { allow } from "@/lib/ratelimit";

function tokenHint(enc: string) {
  try { return mask(decrypt(enc)); } catch { return "unreadable"; }
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/channels">) {
  const { slug } = await ctx.params;
  const vendor = await currentVendor(slug);
  if (!vendor) return json({ error: "signed out" }, 401);
  const db = await getDb();
  const rows = await db.select().from(channelConnections).where(eq(channelConnections.vendorId, vendor.id)).orderBy(asc(channelConnections.createdAt));
  return json({
    webhookUrl: `${await baseUrl()}/api/channels/meta`,
    verifyTokenConfigured: Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN),
    appSecretConfigured: Boolean(process.env.META_APP_SECRET),
    channels: rows.map((r) => ({
      id: r.id, channel: r.channel, externalId: r.externalId, displayName: r.displayName,
      active: r.active, tokenHint: tokenHint(r.accessTokenEnc), createdAt: r.createdAt,
    })),
  });
}

const Connect = z.object({
  channel: z.enum(["whatsapp", "messenger", "instagram"]),
  externalId: z.string().trim().regex(/^\d{5,30}$/, "externalId must be 5–30 digits"),
  displayName: z.string().trim().max(100).optional(),
  accessToken: z.string().trim().min(20).max(1000),
});

export async function POST(req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/channels">) {
  const { slug } = await ctx.params;
  const vendor = await currentVendor(slug);
  if (!vendor) return json({ error: "signed out" }, 401);
  if (!allow(`channels:${vendor.id}`, 20, 10 * 60_000)) return json({ error: "Too many changes. Try again in a few minutes." }, 429);
  const parsed = Connect.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "bad request" }, 400);
  const { channel, externalId, displayName, accessToken } = parsed.data;

  const db = await getDb();
  const existing = (await db.select().from(channelConnections)
    .where(and(eq(channelConnections.channel, channel), eq(channelConnections.externalId, externalId))).limit(1))[0];
  if (existing && existing.vendorId !== vendor.id) return json({ error: "That account is already connected to another shop." }, 409);

  const values = { displayName: displayName || null, accessTokenEnc: encrypt(accessToken), active: true };
  let id: string;
  if (existing) {
    await db.update(channelConnections).set(values).where(eq(channelConnections.id, existing.id));
    id = existing.id;
  } else {
    const [row] = await db.insert(channelConnections).values({ vendorId: vendor.id, channel, externalId, ...values })
      .onConflictDoNothing().returning();
    if (!row) return json({ error: "That account is already connected to another shop." }, 409);
    id = row.id;
  }
  await logEvent(db, { vendorId: vendor.id, type: "channel.connected", data: { channel, externalId, id } });
  return json({ ok: true, id });
}

const Toggle = z.object({ id: z.string().min(1).max(64), active: z.boolean() });

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/channels">) {
  const { slug } = await ctx.params;
  const vendor = await currentVendor(slug);
  if (!vendor) return json({ error: "signed out" }, 401);
  if (!allow(`channels:${vendor.id}`, 20, 10 * 60_000)) return json({ error: "Too many changes. Try again in a few minutes." }, 429);
  const parsed = Toggle.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad request" }, 400);
  const db = await getDb();
  const [row] = await db.update(channelConnections).set({ active: parsed.data.active })
    .where(and(eq(channelConnections.id, parsed.data.id), eq(channelConnections.vendorId, vendor.id))).returning();
  if (!row) return json({ error: "not found" }, 404);
  await logEvent(db, {
    vendorId: vendor.id, type: parsed.data.active ? "channel.connected" : "channel.disconnected",
    data: { channel: row.channel, externalId: row.externalId, id: row.id, paused: !parsed.data.active },
  });
  return json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/channels">) {
  const { slug } = await ctx.params;
  const vendor = await currentVendor(slug);
  if (!vendor) return json({ error: "signed out" }, 401);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return json({ error: "bad request" }, 400);
  const db = await getDb();
  const [row] = await db.delete(channelConnections)
    .where(and(eq(channelConnections.id, id), eq(channelConnections.vendorId, vendor.id))).returning();
  if (!row) return json({ error: "not found" }, 404);
  await logEvent(db, { vendorId: vendor.id, type: "channel.disconnected", data: { channel: row.channel, externalId: row.externalId, id: row.id } });
  return json({ ok: true });
}
