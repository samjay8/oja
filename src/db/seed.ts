// Demo data. Both shops are fictional; the UI labels them as demo shops.

import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { DB } from "./index";
import { deliveryZones, products, reviews, vendors } from "./schema";

const hash = (k: string) => createHash("sha256").update(k).digest("hex");

export const DEMO_SLUG = "ife-textiles";
export const DEMO_NGN_SLUG = "tolu-cakes";

export async function seed(db: DB, opts: { vendorKey: string }) {
  const existing = await db.select().from(vendors).where(eq(vendors.slug, DEMO_SLUG)).limit(1);
  if (existing.length) {
    await db.update(vendors).set({ dashboardKeyHash: hash(opts.vendorKey) }).where(eq(vendors.slug, DEMO_SLUG));
    await db.update(vendors).set({ dashboardKeyHash: hash(opts.vendorKey) }).where(eq(vendors.slug, DEMO_NGN_SLUG));
    return { created: false };
  }

  const [ife] = await db.insert(vendors).values({
    slug: DEMO_SLUG,
    name: "Ifẹ́ Textiles",
    tagline: "Hand-dyed adire and aso-oke from Abeokuta, shipped worldwide",
    country: "NG",
    currency: "USD",
    paypalVerified: true,
    replyMode: "autopilot", // judge mode: replies go straight out so the demo works alone
    playbook: { maxRounds: 3, concession: 0.5, priceStepMinor: 100, loyaltyDiscount: 0.05 },
    salesScript: "Warm and direct. Greet with 'Ẹ káàbọ̀!' the first time. Mention that every piece is hand-dyed so colours vary slightly. For aso-ebi groups, ask for the event date and headcount.",
    dashboardKeyHash: hash(opts.vendorKey),
  }).returning();

  const items = await db.insert(products).values([
    { vendorId: ife.id, name: "Adire two-piece (indigo)", description: "Hand-dyed cotton adire top and wrapper, indigo. Sizes S–XXL.", listPriceMinor: 8500, minPriceMinor: 6800, stock: 12, imageUrl: null, videoUrl: null },
    { vendorId: ife.id, name: "Aso-oke gele and ipele set", description: "Hand-woven aso-oke head tie and shoulder sash. Gold, wine or emerald.", listPriceMinor: 4500, minPriceMinor: 3600, stock: 20 },
    { vendorId: ife.id, name: "Aso-ebi adire fabric (per 5-yard piece)", description: "Matching adire fabric for group events. Price per 5-yard piece; bulk prices for groups.", listPriceMinor: 3000, minPriceMinor: 2200,
      tiers: [{ minQty: 10, unitPriceMinor: 2600 }, { minQty: 30, unitPriceMinor: 2400 }], stock: null, leadTimeDays: 5 },
    { vendorId: ife.id, name: "Custom agbada (made to measure)", description: "Three-piece agbada in adire or aso-oke, made to your measurements.", listPriceMinor: 16000, minPriceMinor: 13000, stock: null, leadTimeDays: 7 },
  ]).returning();

  await db.insert(deliveryZones).values([
    { vendorId: ife.id, country: "NG", region: "Lagos", costMinor: 500, etaDaysMin: 1, etaDaysMax: 2, carrier: "GIG Logistics", tracked: true },
    { vendorId: ife.id, country: "NG", region: null, costMinor: 900, etaDaysMin: 2, etaDaysMax: 4, carrier: "GIG Logistics", tracked: true },
    { vendorId: ife.id, country: "GB", region: null, costMinor: 3800, etaDaysMin: 4, etaDaysMax: 6, carrier: "DHL Express", tracked: true },
    { vendorId: ife.id, country: "US", region: null, costMinor: 4500, etaDaysMin: 5, etaDaysMax: 8, carrier: "DHL Express", tracked: true },
    { vendorId: ife.id, country: "CA", region: null, costMinor: 4800, etaDaysMin: 5, etaDaysMax: 8, carrier: "DHL Express", tracked: true },
    { vendorId: ife.id, country: "*", region: null, costMinor: 5500, etaDaysMin: 6, etaDaysMax: 10, carrier: "DHL Express", tracked: true },
  ]);

  await db.insert(reviews).values([
    { vendorId: ife.id, productId: items[0].id, author: "Demo buyer, London", rating: 5, body: "Colour was exactly like the video and it arrived in 5 days." },
    { vendorId: ife.id, productId: items[2].id, author: "Demo buyer, Houston", rating: 5, body: "Ordered for 24 people for my sister's wedding. Everyone got theirs on time." },
    { vendorId: ife.id, productId: null, author: "Demo buyer, Lagos", rating: 4, body: "Lovely fabric. Delivery took a day longer than quoted but they kept me updated." },
  ]);

  const [tolu] = await db.insert(vendors).values({
    slug: DEMO_NGN_SLUG,
    name: "Tolu's Cakes",
    tagline: "Celebration cakes and small chops in Lagos",
    country: "NG",
    currency: "NGN",
    paypalVerified: false,
    bankTransferDetails: "Demo Bank, account 0000000000, Tolu's Cakes Ltd (demo details)",
    replyMode: "copilot",
    playbook: { maxRounds: 2, concession: 0.5, priceStepMinor: 50_000 },
    salesScript: "Ask for the date and number of guests first. Orders need 3 days' notice.",
    dashboardKeyHash: hash(opts.vendorKey),
  }).returning();
  await db.insert(products).values([
    { vendorId: tolu.id, name: "Two-tier celebration cake", description: "Vanilla or red velvet, buttercream finish, serves 40.", listPriceMinor: 8_500_000, minPriceMinor: 7_000_000, stock: null, leadTimeDays: 3 },
    { vendorId: tolu.id, name: "Small chops tray (50 pieces)", description: "Puff-puff, samosa, spring rolls, peppered gizzard.", listPriceMinor: 3_500_000, minPriceMinor: 3_000_000, stock: null, leadTimeDays: 1 },
  ]);
  await db.insert(deliveryZones).values([
    { vendorId: tolu.id, country: "NG", region: "Lagos", costMinor: 500_000, etaDaysMin: 0, etaDaysMax: 0, carrier: "Own rider", tracked: false },
  ]);

  return { created: true };
}
