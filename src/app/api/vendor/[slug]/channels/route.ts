import type { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { channelConnections } from "@/db/schema";
import { baseUrl, currentVendor, json } from "@/lib/app";
import { logEvent } from "@/lib/commerce";
import { decrypt, encrypt, mask } from "@/lib/crypto";
import { channelLink, normalizeHandle, type MetaChannel } from "@/lib/channels/links";
import { allow } from "@/lib/ratelimit";

/** "" clears the handle; anything else must normalize to a valid one. */
const HandleInput = z.string().trim().max(80).optional();

function parseHandle(channel: MetaChannel, raw: string | undefined): { ok: true; value: string | null | undefined } | { ok: false; error: string } {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === "") return { ok: true, value: null };
  const value = normalizeHandle(channel, raw);
  if (value) return { ok: true, value };
  return {
    ok: false,
    error: channel === "whatsapp"
      ? "Public number must be the full WhatsApp number with country code, e.g. 2348012345678."
      : channel === "messenger"
        ? "Page username may use letters, numbers and dots (up to 50)."
        : "Instagram username may use letters, numbers, dots and underscores (up to 30).",
  };
}

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
      publicHandle: r.publicHandle, link: channelLink(r.channel, r.publicHandle),
      active: r.active, tokenHint: tokenHint(r.accessTokenEnc), createdAt: r.createdAt,
    })),
  });
}

const Connect = z.object({
  channel: z.enum(["whatsapp", "messenger", "instagram"]),
  externalId: z.string().trim().regex(/^\d{5,30}$/, "externalId must be 5–30 digits"),
  displayName: z.string().trim().max(100).optional(),
  publicHandle: HandleInput,
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
  const handle = parseHandle(channel, parsed.data.publicHandle);
  if (!handle.ok) return json({ error: handle.error }, 400);

  const db = await getDb();
  const existing = (await db.select().from(channelConnections)
    .where(and(eq(channelConnections.channel, channel), eq(channelConnections.externalId, externalId))).limit(1))[0];
  if (existing && existing.vendorId !== vendor.id) return json({ error: "That account is already connected to another shop." }, 409);

  const values = {
    displayName: displayName || null, accessTokenEnc: encrypt(accessToken), active: true,
    ...(handle.value !== undefined ? { publicHandle: handle.value } : {}),
  };
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

const Update = z.object({ id: z.string().min(1).max(64), active: z.boolean().optional(), publicHandle: HandleInput })
  .refine((b) => b.active !== undefined || b.publicHandle !== undefined, "nothing to change");

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/channels">) {
  const { slug } = await ctx.params;
  const vendor = await currentVendor(slug);
  if (!vendor) return json({ error: "signed out" }, 401);
  if (!allow(`channels:${vendor.id}`, 20, 10 * 60_000)) return json({ error: "Too many changes. Try again in a few minutes." }, 429);
  const parsed = Update.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "bad request" }, 400);
  const { id, active, publicHandle } = parsed.data;
  const db = await getDb();
  const where = and(eq(channelConnections.id, id), eq(channelConnections.vendorId, vendor.id));
  const current = (await db.select({ channel: channelConnections.channel }).from(channelConnections).where(where).limit(1))[0];
  if (!current) return json({ error: "not found" }, 404);
  const handle = parseHandle(current.channel, publicHandle);
  if (!handle.ok) return json({ error: handle.error }, 400);
  const [row] = await db.update(channelConnections).set({
    ...(active !== undefined ? { active } : {}),
    ...(handle.value !== undefined ? { publicHandle: handle.value } : {}),
  }).where(where).returning();
  if (!row) return json({ error: "not found" }, 404);
  if (active !== undefined) {
    await logEvent(db, {
      vendorId: vendor.id, type: active ? "channel.connected" : "channel.disconnected",
      data: { channel: row.channel, externalId: row.externalId, id: row.id, paused: !active },
    });
  }
  return json({ ok: true, publicHandle: row.publicHandle, link: channelLink(row.channel, row.publicHandle) });
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
