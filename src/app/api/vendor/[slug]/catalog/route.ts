import type { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { deliveryZones, products } from "@/db/schema";
import { currentVendor, json } from "@/lib/app";
import { logEvent } from "@/lib/commerce";
import { firstError, productAsInput, ProductInput, zoneAsInput, ZoneInput } from "./validate";

const Kind = z.enum(["product", "zone"]);

async function auth(ctx: RouteContext<"/api/vendor/[slug]/catalog">) {
  const { slug } = await ctx.params;
  return currentVendor(slug);
}

const body = async (req: NextRequest) => (await req.json().catch(() => null)) as Record<string, unknown> | null;

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/catalog">) {
  const vendor = await auth(ctx);
  if (!vendor) return json({ error: "signed out" }, 401);
  const db = await getDb();
  const [items, zones] = await Promise.all([
    db.select().from(products).where(eq(products.vendorId, vendor.id)).orderBy(asc(products.createdAt)),
    db.select().from(deliveryZones).where(eq(deliveryZones.vendorId, vendor.id)).orderBy(asc(deliveryZones.country)),
  ]);
  return json({ currency: vendor.currency, country: vendor.country, products: items, zones });
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/catalog">) {
  const vendor = await auth(ctx);
  if (!vendor) return json({ error: "signed out" }, 401);
  const b = await body(req);
  const kind = Kind.safeParse(b?.kind);
  if (!b || !kind.success) return json({ error: "kind must be product or zone" }, 400);
  const db = await getDb();

  if (kind.data === "product") {
    const p = ProductInput.safeParse(b);
    if (!p.success) return json({ error: firstError(p.error) }, 400);
    const [row] = await db.insert(products).values({ ...p.data, vendorId: vendor.id }).returning();
    await logEvent(db, { vendorId: vendor.id, type: "catalog.product_created", data: { productId: row.id, name: row.name, listPriceMinor: row.listPriceMinor, minPriceMinor: row.minPriceMinor } });
    return json({ ok: true, id: row.id });
  }
  const zz = ZoneInput.safeParse(b);
  if (!zz.success) return json({ error: firstError(zz.error) }, 400);
  const [row] = await db.insert(deliveryZones).values({ ...zz.data, vendorId: vendor.id }).returning();
  await logEvent(db, { vendorId: vendor.id, type: "catalog.zone_created", data: { zoneId: row.id, country: row.country, region: row.region, costMinor: row.costMinor } });
  return json({ ok: true, id: row.id });
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/catalog">) {
  const vendor = await auth(ctx);
  if (!vendor) return json({ error: "signed out" }, 401);
  const b = await body(req);
  const kind = Kind.safeParse(b?.kind);
  if (!b || !kind.success || typeof b.id !== "string") return json({ error: "kind and id are required" }, 400);
  const id = b.id;
  const db = await getDb();
  const patch: Record<string, unknown> = { ...b };
  delete patch.kind;
  delete patch.id;

  if (kind.data === "product") {
    const where = and(eq(products.id, id), eq(products.vendorId, vendor.id));
    const existing = (await db.select().from(products).where(where).limit(1))[0];
    if (!existing) return json({ error: "product not found" }, 404);
    const p = ProductInput.safeParse({ ...productAsInput(existing), ...patch });
    if (!p.success) return json({ error: firstError(p.error) }, 400);
    await db.update(products).set(p.data).where(where);
    await logEvent(db, { vendorId: vendor.id, type: "catalog.product_saved", data: { productId: id, fields: Object.keys(patch), listPriceMinor: p.data.listPriceMinor, minPriceMinor: p.data.minPriceMinor, active: p.data.active } });
    return json({ ok: true, id });
  }
  const where = and(eq(deliveryZones.id, id), eq(deliveryZones.vendorId, vendor.id));
  const existing = (await db.select().from(deliveryZones).where(where).limit(1))[0];
  if (!existing) return json({ error: "zone not found" }, 404);
  const zz = ZoneInput.safeParse({ ...zoneAsInput(existing), ...patch });
  if (!zz.success) return json({ error: firstError(zz.error) }, 400);
  await db.update(deliveryZones).set(zz.data).where(where);
  await logEvent(db, { vendorId: vendor.id, type: "catalog.zone_saved", data: { zoneId: id, fields: Object.keys(patch), costMinor: zz.data.costMinor } });
  return json({ ok: true, id });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/vendor/[slug]/catalog">) {
  const vendor = await auth(ctx);
  if (!vendor) return json({ error: "signed out" }, 401);
  const kind = Kind.safeParse(req.nextUrl.searchParams.get("kind"));
  const id = req.nextUrl.searchParams.get("id");
  if (!kind.success || !id) return json({ error: "kind and id are required" }, 400);
  const db = await getDb();
  if (kind.data === "product") {
    // Orders keep their own copy of names and prices; live offers cascade away.
    const [row] = await db.delete(products).where(and(eq(products.id, id), eq(products.vendorId, vendor.id))).returning({ id: products.id, name: products.name });
    if (!row) return json({ error: "product not found" }, 404);
    await logEvent(db, { vendorId: vendor.id, type: "catalog.product_deleted", data: { productId: id, name: row.name } });
  } else {
    const [row] = await db.delete(deliveryZones).where(and(eq(deliveryZones.id, id), eq(deliveryZones.vendorId, vendor.id))).returning({ id: deliveryZones.id, country: deliveryZones.country });
    if (!row) return json({ error: "zone not found" }, 404);
    await logEvent(db, { vendorId: vendor.id, type: "catalog.zone_deleted", data: { zoneId: id, country: row.country } });
  }
  return json({ ok: true });
}
