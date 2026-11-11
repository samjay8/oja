// Per-key sliding window, in memory. Enough to stop one demo visitor burning the model budget.
//
// Per instance: with more than one server instance each keeps its own counts, so the real
// limit is `limit × instances`. A shared store (Redis/Upstash, or a Postgres table) is the
// fix if Oja ever runs on several instances.
//
// Memory is bounded: at most MAX_KEYS keys, least-recently-hit evicted first. (It used to
// clear everything at 10k keys, which let a flood of fresh keys reset everyone's limits.)

const MAX_KEYS = 10_000;
const hits = new Map<string, number[]>();

export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.delete(key); // re-insert below so Map order = least recently hit first
  const ok = recent.length < limit;
  if (ok) recent.push(now);
  hits.set(key, recent);
  while (hits.size > MAX_KEYS) hits.delete(hits.keys().next().value!);
  return ok;
}

/** Tests only. */
export function rateLimitKeys() {
  return hits.size;
}
