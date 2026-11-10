import { beforeAll, describe, expect, it } from "vitest";
import { openMemoryDb, type DB } from "@/db";
import { seed, DEMO_SLUG } from "@/db/seed";
import { events } from "@/db/schema";
import { vendorBySlug } from "./commerce";
import { DEFAULT_DAILY_TURN_CAP, dailyTurnCap, overCap, turnsToday, utcMidnight } from "./budget";

describe("daily turn cap", () => {
  it("parses the env value", () => {
    expect(dailyTurnCap(undefined)).toBe(DEFAULT_DAILY_TURN_CAP);
    expect(dailyTurnCap("")).toBe(DEFAULT_DAILY_TURN_CAP);
    expect(dailyTurnCap("abc")).toBe(DEFAULT_DAILY_TURN_CAP);
    expect(dailyTurnCap("-1")).toBe(DEFAULT_DAILY_TURN_CAP);
    expect(dailyTurnCap("50")).toBe(50);
    expect(dailyTurnCap("0")).toBe(0);
  });

  it("is over the cap once the count reaches it", () => {
    expect(overCap(399, 400)).toBe(false);
    expect(overCap(400, 400)).toBe(true);
    expect(overCap(0, 0)).toBe(true);
  });

  it("starts the day at UTC midnight", () => {
    expect(utcMidnight(new Date("2026-11-11T23:30:00-08:00")).toISOString()).toBe("2026-11-12T00:00:00.000Z");
    expect(utcMidnight(new Date("2026-11-11T00:00:01Z")).toISOString()).toBe("2026-11-11T00:00:00.000Z");
  });
});

describe("turnsToday", () => {
  let db: DB;
  beforeAll(async () => {
    db = await openMemoryDb();
    await seed(db, { vendorKey: "test-key" });
  }, 60_000);

  it("counts only today's agent.turn events", async () => {
    const vendor = (await vendorBySlug(db, DEMO_SLUG))!;
    const now = new Date();
    const yesterday = new Date(utcMidnight(now).getTime() - 60_000);
    const before = await turnsToday(db, now);
    await db.insert(events).values([
      { vendorId: vendor.id, type: "agent.turn", data: {} },
      { vendorId: vendor.id, type: "agent.turn", data: {} },
      { vendorId: vendor.id, type: "agent.turn", data: {}, createdAt: yesterday },
      { vendorId: vendor.id, type: "order.created", data: {} },
    ]);
    expect(await turnsToday(db, now)).toBe(before + 2);
  });
});
