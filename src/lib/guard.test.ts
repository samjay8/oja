import { describe, expect, it } from "vitest";
import { amountsIn, checkReply } from "./guard";

describe("amountsIn", () => {
  it("reads common price formats", () => {
    expect(amountsIn("It's $120 or $95.50 for two")).toEqual([12000, 9550]);
    expect(amountsIn("₦25,000 only, or 30000 naira with delivery")).toEqual([2500000, 3000000]);
    expect(amountsIn("I can do 15k")).toEqual([1500000]);
    expect(amountsIn("Size 12, ships in 3 days")).toEqual([]);
  });
});

describe("checkReply", () => {
  const allowed = { amounts: new Set([12000, 3500]), urls: new Set(["https://www.sandbox.paypal.com/checkoutnow?token=ABC"]) };
  it("passes amounts and links that came from tools", () => {
    expect(checkReply("Dress is $120 + $35 delivery. Pay here: https://www.sandbox.paypal.com/checkoutnow?token=ABC.", allowed)).toEqual({ ok: true });
  });
  it("blocks invented discounts and links", () => {
    const r = checkReply("For you, $99! Pay at https://evil.example/pay", allowed);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons).toHaveLength(2);
  });
});
