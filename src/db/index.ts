// Postgres in production (Neon); embedded PGlite when DATABASE_URL is unset, so the app
// and tests run with zero setup.

import path from "node:path";
import * as schema from "./schema";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

/**
 * Runtime pool size. Each poll is ~2 queries, so throughput ≈ pool / (2 × DB round trip).
 * DB_POOL_MAX overrides; default 20 on Neon's pooled (PgBouncer, "-pooler") URL, which takes
 * thousands of clients, and 10 on a direct URL (Neon's smallest computes cap direct
 * connections at ~100, shared with migrations, the console and every instance).
 */
export function poolSize(url: string, raw = process.env.DB_POOL_MAX): number {
  const n = Number(raw);
  if (raw && Number.isInteger(n) && n > 0) return n;
  return /-pooler\./.test(url) ? 20 : 10;
}

async function open(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    // Migrations want a direct (unpooled) connection when DATABASE_URL is Neon's pooled URL.
    const direct = process.env.DATABASE_URL_UNPOOLED;
    if (direct) {
      const once = postgres(direct, { max: 1, prepare: false, onnotice: () => {} });
      try { await migrate(drizzle(once, { schema }), { migrationsFolder: MIGRATIONS }); } finally { await once.end(); }
    }
    // prepare: false keeps it compatible with PgBouncer transaction mode (Neon pooled URL).
    // Idle connections close after 30 s so a quiet app lets Neon scale to zero.
    const db = drizzle(postgres(url, { max: poolSize(url), prepare: false, idle_timeout: 30, connect_timeout: 15 }), { schema });
    if (!direct) await migrate(db, { migrationsFolder: MIGRATIONS });
    return seeded(db as unknown as DB);
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  if (dir !== "memory") (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const db = drizzle(new PGlite(dir === "memory" ? undefined : dir), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return seeded(db as unknown as DB);
}

/** Judges need a working demo shop on first boot. SEED_DEMO=0 turns this off. */
async function seeded(db: DB): Promise<DB> {
  if (process.env.SEED_DEMO !== "0") {
    const { seed } = await import("./seed");
    await seed(db, { vendorKey: process.env.DEMO_VENDOR_KEY ?? "oja-demo-2026" });
  }
  return db;
}

const g = globalThis as unknown as { __ojaDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  // A failed boot (e.g. Neon waking up) is retried on the next request, not cached forever.
  g.__ojaDb ??= open().catch((e) => { g.__ojaDb = undefined; throw e; });
  return g.__ojaDb;
}

/** Tests only: a fresh in-memory database. */
export async function openMemoryDb(): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as DB;
}

export { schema };
