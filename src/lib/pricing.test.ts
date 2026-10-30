import { describe, expect, it } from "vitest";
import { DEFAULT_PLAYBOOK, evaluateOffer, unitPriceFor, type PricedProduct } from "./pricing";

const dress: PricedProduct = { listPriceMinor: 12000, minPriceMinor: 9000 }; // $120, floor $90

function haggle(offers: (number | undefined)[], product = dress) {
  const counters: number[] = [];
  const out = [];
  for (const offerMinor of offers) {
    const d = evaluateOffer({ product, qty: 1, offerMinor, previousCounters: counters });
    out.push(d);
    if (d.decision === "counter") counters.push(d.unitPriceMinor);
    else break;
  }
  return out;
}

describe("evaluateOffer", () => {
  it("accepts at our ask when the buyer offers more", () => {
    expect(evaluateOffer({ product: dress, qty: 1, offerMinor: 15000, previousCounters: [] }))
      .toEqual({ decision: "accept", unitPriceMinor: 12000, final: true });
  });

  it("never goes below the floor, whatever the buyer does", () => {
    for (const lowball of [0, 1, 100, 5000, 8999]) {
      const rounds = haggle(Array(10).fill(lowball));
      for (const r of rounds) expect(r.unitPriceMinor).toBeGreaterThanOrEqual(9000);
      expect(rounds.at(-1)!.final).toBe(true);
    }
  });

  it("counters move monotonically down and stop after maxRounds", () => {
    const rounds = haggle([6000, 6000, 6000, 6000, 6000]);
    const prices = rounds.map((r) => r.unitPriceMinor);
    for (let i = 1; i < prices.length; i++) expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
    expect(rounds.length).toBe(5);
    expect(rounds.at(-1)).toMatchObject({ decision: "counter", final: true });
  });

  it("accepts an offer above the floor once rounds run out", () => {
    const rounds = haggle([9500, 9500, 9500, 9500]);
    expect(rounds.at(-1)).toEqual({ decision: "accept", unitPriceMinor: 9500, final: true });
  });

  it("'last price?' with no number still concedes toward the floor, not below", () => {
    const d = evaluateOffer({ product: dress, qty: 1, previousCounters: [] });
    expect(d.decision).toBe("counter");
    expect(d.unitPriceMinor).toBeLessThan(12000);
    expect(d.unitPriceMinor).toBeGreaterThanOrEqual(9000);
  });

  it("rejects non-integer or negative offers", () => {
    expect(() => evaluateOffer({ product: dress, qty: 1, offerMinor: 99.5, previousCounters: [] })).toThrow();
    expect(() => evaluateOffer({ product: dress, qty: 1, offerMinor: -1, previousCounters: [] })).toThrow();
  });

  it("closes small gaps instead of haggling over pennies", () => {
    const d = evaluateOffer({ product: dress, qty: 1, offerMinor: 11900, previousCounters: [] });
    expect(d).toEqual({ decision: "accept", unitPriceMinor: 11900, final: true });
  });
});

describe("unitPriceFor", () => {
  const aso: PricedProduct = {
    listPriceMinor: 4000,
    minPriceMinor: 3000,
    tiers: [{ minQty: 20, unitPriceMinor: 3200 }, { minQty: 10, unitPriceMinor: 3500 }, { minQty: 50, unitPriceMinor: 2500 }],
  };
  it("applies the best tier for the quantity but never below the floor", () => {
    expect(unitPriceFor(aso, 1)).toBe(4000);
    expect(unitPriceFor(aso, 10)).toBe(3500);
    expect(unitPriceFor(aso, 25)).toBe(3200);
    expect(unitPriceFor(aso, 60)).toBe(3000);
  });
  it("applies loyalty discount, rounded up to the price step", () => {
    expect(unitPriceFor(dress, 1, { returning: true, playbook: { ...DEFAULT_PLAYBOOK, loyaltyDiscount: 0.05 } })).toBe(11400);
  });
});
