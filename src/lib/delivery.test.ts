import { describe, expect, it } from "vitest";
import { quoteDelivery, type DeliveryZone } from "./delivery";

const zones: DeliveryZone[] = [
  { country: "NG", region: "Lagos", costMinor: 300, etaDaysMin: 1, etaDaysMax: 2, carrier: "GIG Logistics", tracked: true },
  { country: "NG", region: null, costMinor: 600, etaDaysMin: 2, etaDaysMax: 4, carrier: "GIG Logistics", tracked: true },
  { country: "GB", region: null, costMinor: 3500, etaDaysMin: 5, etaDaysMax: 8, carrier: "DHL Express", tracked: true },
  { country: "*", region: null, costMinor: 4500, etaDaysMin: 6, etaDaysMax: 10, carrier: "DHL Express", tracked: true },
];

describe("quoteDelivery", () => {
  it("prefers region, then country, then fallback", () => {
    expect(quoteDelivery(zones, "ng", "lagos")).toMatchObject({ costMinor: 300, matched: "region" });
    expect(quoteDelivery(zones, "NG", "Kano")).toMatchObject({ costMinor: 600, matched: "country" });
    expect(quoteDelivery(zones, "GB")).toMatchObject({ costMinor: 3500, matched: "country" });
    expect(quoteDelivery(zones, "US")).toMatchObject({ costMinor: 4500, matched: "fallback" });
  });
  it("matches a zone by the state when the city isn't listed (Lekki, Lagos)", () => {
    expect(quoteDelivery(zones, "NG", ["Lekki", "Lagos"])).toMatchObject({ costMinor: 300, matched: "region" });
    expect(quoteDelivery(zones.slice(0, 1), "NG", ["Lekki", undefined])).toBeNull();
  });
  it("returns null when the vendor doesn't ship there", () => {
    expect(quoteDelivery(zones.slice(0, 3), "US")).toBeNull();
  });
});
