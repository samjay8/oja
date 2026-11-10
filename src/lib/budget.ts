// App-wide daily cap on model turns (PRD M12), so a flood of chats can't run up the bill.
// Counted from "agent.turn" events since UTC midnight. OJA_DAILY_TURN_CAP, default 400.

import { and, count, eq, gte } from "drizzle-orm";
import type { DB } from "@/db";
import { events } from "@/db/schema";

export const DEFAULT_DAILY_TURN_CAP = 400;

export function dailyTurnCap(raw = process.env.OJA_DAILY_TURN_CAP): number {
  const n = Number(raw);
  return raw !== undefined && raw.trim() !== "" && Number.isInteger(n) && n >= 0 ? n : DEFAULT_DAILY_TURN_CAP;
}

export function utcMidnight(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function overCap(turnsToday: number, cap: number) {
  return turnsToday >= cap;
}

export async function turnsToday(db: DB, now = new Date()): Promise<number> {
  const [row] = await db.select({ n: count() }).from(events)
    .where(and(eq(events.type, "agent.turn"), gte(events.createdAt, utcMidnight(now))));
  return Number(row?.n ?? 0);
}

export async function budgetExceeded(db: DB, now = new Date()): Promise<boolean> {
  return overCap(await turnsToday(db, now), dailyTurnCap());
}
