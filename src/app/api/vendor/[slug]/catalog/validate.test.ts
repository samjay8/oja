import { describe, expect, it } from "vitest";
import { fromMinor, productAsInput, ProductInput, toMinor, ZoneInput } from "./validate";

const base = { name: "Aso-oke", listPrice: "25000", minPrice: "20000" };

describe("toMinor", () => {
  it("converts decimals with string math", () => {
    expect(toMinor("12.5")).toBe(1250);
    expect(toMinor("0.1")).toBe(10);
    expect(toMinor("19.99")).toBe(1999);
    expect(toMinor(0.29)).toBe(29);
    expect(toMinor("25,000")).toBe(2_500_000);
  });
  it("rejects negatives, junk and extra precision", () => {
    for (const bad of ["-1", "1.234", "abc", "", "1e5", " .5", "Infinity"]) expect(() => toMinor(bad)).toThrow();
    expect(() => toMinor(Number.NaN)).toThrow();
  });
  it("round-trips", () => {
    for (const n of [0, 5, 100, 1999, 2_500_000]) expect(toMinor(fromMinor(n))).toBe(n);
  });
});

describe("ProductInput", () => {
  it("parses to minor units with defaults", () => {
    const p = ProductInput.parse({ ...base, stock: "", leadTimeDays: "" });
    expect(p).toMatchObject({ listPriceMinor: 2_500_000, minPriceMinor: 2_000_000, stock: null, leadTimeDays: 0, tiers: [], active: true, videoUrl: null });
  });
  it("rejects a minimum above the list price", () => {
    const r = ProductInput.safeParse({ ...base, minPrice: "30000" });
    expect(r.success).toBe(false);
  });
  it("rejects tier prices below the minimum", () => {
    const r = ProductInput.safeParse({ ...base, tiers: [{ minQty: 6, unitPrice: "19999.99" }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/below your minimum/);
  });
  it("accepts tiers at the floor and sorts them", () => {
    const p = ProductInput.parse({ ...base, tiers: [{ minQty: 12, unitPrice: "20000" }, { minQty: 6, unitPrice: "22000" }] });
    expect(p.tiers).toEqual([{ minQty: 6, unitPriceMinor: 2_200_000 }, { minQty: 12, unitPriceMinor: 2_000_000 }]);
  });
  it("rejects duplicate tier quantities, fractional stock and non-https video", () => {
    expect(ProductInput.safeParse({ ...base, tiers: [{ minQty: 6, unitPrice: "21000" }, { minQty: 6, unitPrice: "22000" }] }).success).toBe(false);
    expect(ProductInput.safeParse({ ...base, stock: 1.5 }).success).toBe(false);
    expect(ProductInput.safeParse({ ...base, stock: -1 }).success).toBe(false);
    expect(ProductInput.safeParse({ ...base, videoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(ProductInput.safeParse({ ...base, videoUrl: "http://x.test/v.mp4" }).success).toBe(false);
    expect(ProductInput.safeParse({ ...base, videoUrl: "https://x.test/v.mp4" }).success).toBe(true);
  });
  it("re-validates a merged partial update", () => {
    const stored = { ...ProductInput.parse(base), description: "" };
    expect(ProductInput.safeParse({ ...productAsInput(stored), listPrice: "15000" }).success).toBe(false);
    expect(ProductInput.parse({ ...productAsInput(stored), active: false }).active).toBe(false);
  });
});

describe("ZoneInput", () => {
  it("parses a zone", () => {
    expect(ZoneInput.parse({ country: "ng", region: "", cost: "3500", etaDaysMin: "1", etaDaysMax: "3", carrier: "GIG", tracked: true }))
      .toEqual({ country: "NG", region: null, costMinor: 350_000, etaDaysMin: 1, etaDaysMax: 3, carrier: "GIG", tracked: true });
    expect(ZoneInput.parse({ country: "*", cost: 40, etaDaysMin: 5, etaDaysMax: 10, carrier: "DHL" }).country).toBe("*");
  });
  it("rejects bad countries and inverted ETAs", () => {
    expect(ZoneInput.safeParse({ country: "NGA", cost: "1", etaDaysMin: 1, etaDaysMax: 2, carrier: "x" }).success).toBe(false);
    expect(ZoneInput.safeParse({ country: "NG", cost: "1", etaDaysMin: 5, etaDaysMax: 2, carrier: "x" }).success).toBe(false);
    expect(ZoneInput.safeParse({ country: "NG", cost: "-1", etaDaysMin: 1, etaDaysMax: 2, carrier: "x" }).success).toBe(false);
  });
});
