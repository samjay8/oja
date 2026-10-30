// Postgres in production (Neon); embedded PGlite when DATABASE_URL is unset, so the app
// and tests run with zero setup.

import path from "node:path";
import * as schema from "./schema";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

async function open(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const db = drizzle(postgres(url, { max: 5, prepare: false }), { schema });
    await migrate(db, { migrationsFolder: MIGRATIONS });
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
  g.__ojaDb ??= open();
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
