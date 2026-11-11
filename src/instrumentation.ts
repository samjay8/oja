// Warm the database (connect, migrate, seed) as the server boots instead of on the first
// shop or chat request. Not awaited, so the server starts answering straight away.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { getDb } = await import("./db");
  getDb().catch((e) => console.error("[db] warm-up failed; retrying on first request", e));
}
