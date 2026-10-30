// Delivery quotes come from the vendor's own zone table, never from the AI.
// Interviews: delivery cost/time was the #1 lost-sale reason (5/5).

export type DeliveryZone = {
  /** ISO-3166 alpha-2, or "*" for anywhere else. */
  country: string;
  /** Optional city/state match (case-insensitive). Empty = whole country. */
  region?: string | null;
  costMinor: number;
  etaDaysMin: number;
  etaDaysMax: number;
  carrier: string;
  tracked: boolean;
};

export type DeliveryQuote = DeliveryZone & { matched: "region" | "country" | "fallback" };

export function quoteDelivery(zones: DeliveryZone[], country: string, region?: string): DeliveryQuote | null {
  const c = country.trim().toUpperCase();
  const r = region?.trim().toLowerCase();
  const inCountry = zones.filter((z) => z.country.toUpperCase() === c);
  if (r) {
    const hit = inCountry.find((z) => z.region && z.region.toLowerCase() === r);
    if (hit) return { ...hit, matched: "region" };
  }
  const whole = inCountry.find((z) => !z.region);
  if (whole) return { ...whole, matched: "country" };
  const any = zones.find((z) => z.country === "*");
  return any ? { ...any, matched: "fallback" } : null;
}

export function etaText(q: Pick<DeliveryZone, "etaDaysMin" | "etaDaysMax">): string {
  return q.etaDaysMin === q.etaDaysMax
    ? `${q.etaDaysMin} day${q.etaDaysMin === 1 ? "" : "s"}`
    : `${q.etaDaysMin}–${q.etaDaysMax} days`;
}
