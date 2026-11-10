// Catalog input validation. Sellers type decimal prices in their own currency; the
// database stores integer minor units. All conversion happens here with string math,
// never floats, and the floor rules (min ≤ list, tiers ≥ min) are enforced on the server.

import { z } from "zod";

const MAX_MAJOR = 100_000_000;

/** "12.50" | 12.5 → 1250. Throws on anything that isn't a plain non-negative decimal. */
export function toMinor(input: string | number): number {
  const s = typeof input === "number" ? (Number.isFinite(input) ? String(input) : "") : input.trim().replace(/,/g, "");
  const m = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) throw new Error("not a price");
  const whole = Number(m[1]);
  if (whole > MAX_MAJOR) throw new Error("too large");
  return whole * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

export function fromMinor(minor: number): string {
  const whole = Math.floor(minor / 100);
  const frac = minor % 100;
  return frac ? `${whole}.${String(frac).padStart(2, "0")}` : String(whole);
}

const money = (label: string) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    try {
      return toMinor(v);
    } catch {
      ctx.addIssue({ code: "custom", message: `${label} must be a number like 2500 or 12.50` });
      return z.NEVER;
    }
  });

const int = (label: string, min: number, max: number) =>
  z.coerce.number({ message: `${label} must be a whole number` })
    .int(`${label} must be a whole number`).min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`);

const blankToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const optionalUrl = z.preprocess(
  blankToNull,
  z.string().trim().max(500).url("Use a full link starting with https://")
    .refine((u) => /^https:\/\//i.test(u), "Use a full link starting with https://").nullable(),
);

export const ProductInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(2000).default(""),
  listPrice: money("List price"),
  minPrice: money("Minimum price"),
  stock: z.preprocess(blankToNull, int("Stock", 0, 1_000_000).nullable()),
  leadTimeDays: z.preprocess((v) => (v === "" || v == null ? 0 : v), int("Lead time", 0, 365)),
  tiers: z.array(z.object({ minQty: int("Tier quantity", 2, 10_000), unitPrice: money("Tier price") })).max(10).default([]),
  imageUrl: optionalUrl.default(null),
  videoUrl: optionalUrl.default(null),
  active: z.boolean().default(true),
}).superRefine((p, ctx) => {
  if (p.minPrice > p.listPrice) ctx.addIssue({ code: "custom", path: ["minPrice"], message: "Minimum price can't be above the list price" });
  const seen = new Set<number>();
  p.tiers.forEach((t, i) => {
    if (t.unitPrice < p.minPrice) ctx.addIssue({ code: "custom", path: ["tiers", i, "unitPrice"], message: `Tier price for ${t.minQty}+ is below your minimum price` });
    if (t.unitPrice > p.listPrice) ctx.addIssue({ code: "custom", path: ["tiers", i, "unitPrice"], message: `Tier price for ${t.minQty}+ is above the list price` });
    if (seen.has(t.minQty)) ctx.addIssue({ code: "custom", path: ["tiers", i, "minQty"], message: `Two tiers start at ${t.minQty}` });
    seen.add(t.minQty);
  });
}).transform((p) => ({
  name: p.name,
  description: p.description,
  listPriceMinor: p.listPrice,
  minPriceMinor: p.minPrice,
  stock: p.stock,
  leadTimeDays: p.leadTimeDays,
  tiers: [...p.tiers].sort((a, b) => a.minQty - b.minQty).map((t) => ({ minQty: t.minQty, unitPriceMinor: t.unitPrice })),
  imageUrl: p.imageUrl,
  videoUrl: p.videoUrl,
  active: p.active,
}));

export type ProductValues = z.output<typeof ProductInput>;

export const ZoneInput = z.object({
  country: z.string().trim().toUpperCase().regex(/^([A-Z]{2}|\*)$/, "Country is a 2-letter code like NG, or * for everywhere else"),
  region: z.preprocess(blankToNull, z.string().trim().max(80).nullable()).default(null),
  cost: money("Delivery cost"),
  etaDaysMin: int("Earliest days", 0, 120),
  etaDaysMax: int("Latest days", 0, 120),
  carrier: z.string().trim().min(1, "Carrier is required").max(60),
  tracked: z.boolean().default(true),
}).superRefine((z0, ctx) => {
  if (z0.etaDaysMax < z0.etaDaysMin) ctx.addIssue({ code: "custom", path: ["etaDaysMax"], message: "Latest days can't be before earliest days" });
}).transform((z0) => ({
  country: z0.country, region: z0.region, costMinor: z0.cost,
  etaDaysMin: z0.etaDaysMin, etaDaysMax: z0.etaDaysMax, carrier: z0.carrier, tracked: z0.tracked,
}));

export type ZoneValues = z.output<typeof ZoneInput>;

/** A stored product as editable input, so partial PATCHes re-validate the whole row. */
export function productAsInput(p: {
  name: string; description: string; listPriceMinor: number; minPriceMinor: number; stock: number | null; leadTimeDays: number;
  tiers: { minQty: number; unitPriceMinor: number }[]; imageUrl: string | null; videoUrl: string | null; active: boolean;
}) {
  return {
    name: p.name, description: p.description, listPrice: fromMinor(p.listPriceMinor), minPrice: fromMinor(p.minPriceMinor),
    stock: p.stock, leadTimeDays: p.leadTimeDays, tiers: p.tiers.map((t) => ({ minQty: t.minQty, unitPrice: fromMinor(t.unitPriceMinor) })),
    imageUrl: p.imageUrl, videoUrl: p.videoUrl, active: p.active,
  };
}

export function zoneAsInput(z0: { country: string; region: string | null; costMinor: number; etaDaysMin: number; etaDaysMax: number; carrier: string; tracked: boolean }) {
  return { country: z0.country, region: z0.region, cost: fromMinor(z0.costMinor), etaDaysMin: z0.etaDaysMin, etaDaysMax: z0.etaDaysMax, carrier: z0.carrier, tracked: z0.tracked };
}

export function firstError(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Invalid input";
}
