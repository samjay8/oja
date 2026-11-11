import { describe, expect, it } from "vitest";
import { allow, rateLimitKeys } from "./ratelimit";

describe("in-memory rate limit", () => {
  it("allows up to the limit in the window", () => {
    const k = `t-${Math.random()}`;
    expect([1, 2, 3].map(() => allow(k, 2, 60_000))).toEqual([true, true, false]);
  });

  it("stays bounded, and a flood of new keys doesn't reset an active limit", () => {
    const k = `busy-${Math.random()}`;
    allow(k, 1, 60_000);
    for (let i = 0; i < 12_000; i++) {
      allow(`flood-${i}`, 5, 60_000);
      if (i % 1000 === 0) expect(allow(k, 1, 60_000)).toBe(false); // keeps k recently hit
    }
    expect(rateLimitKeys()).toBeLessThanOrEqual(10_000);
    expect(allow(k, 1, 60_000)).toBe(false);
  });
});
