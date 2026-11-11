# Load test: can Oja take 1,000 people at once?

Measured 2026-11-11/12 (Lagos time). Scripts are in `scripts/load/`, raw results in `scripts/load/results/`.

## Verdict

**Not on the current free Render plan.** The live app hits its limit at about 50 people doing things at the same moment, not 1,000. The code is not the main problem. The hosting plan is: one sleeping instance with about a tenth of a CPU and 512 MB of memory.

| Who | 1,000 at once on today's deploy? | What limits it | After the fixes in this pass |
|---|---|---|---|
| **Browsing** (home, shop pages) | **No.** The home page tops out at ~50 req/s. The shop page manages **2.4 pages/s**, with p95 19 s at 50 users. A 50-user burst restarted the instance. | CPU and memory on the free instance. The shop page costs ~50 ms of CPU and a 60 KB server render each time. | Unchanged (I didn't own the shop page). This needs a bigger plan, and caching the shop page. |
| **Chats left open** (polling) | **No.** 1,000 open chats meant 250 req/s of polling. The live server answers ~30–34 req/s. | Polling every 4 s, whether or not anyone was looking. | Hidden tabs stop polling, and idle chats back off to one poll every ~15 s. 1,000 idle chats drops to **≤ 67 req/s** (about 33 if half the tabs are in the background). That is around the free instance's limit and comfortable on Starter or Standard. Each poll is also cheaper: 1 query for an empty chat (was 2), 2 for a chat with messages (was 3). |
| **Actively chatting with the AI** | **No, because of the budget cap rather than speed.** 20 buyers sending at once all got an AI reply within 5 s. But the app-wide daily cap is **400 model turns**, so ~80 people sending 5 messages each use it up. After that every buyer sees "seller reviewing". | `OJA_DAILY_TURN_CAP`, Anthropic rate limits for the account's tier, and the per-IP limit (60 messages per 10 min, shared by everyone behind one NAT or conference Wi-Fi). | Unchanged on purpose: these are cost and safety controls. Raising them is the owner's decision (see below). |
| **Sellers** (dashboard inbox) | Sellers are few. On a full core the inbox serves ~20 req/s, which is about 80 sellers polling every 4 s. Not measured on production because it needs a seller sign-in. | 5 queries per poll, including every message of 50 conversations. | 3 round trips per poll instead of 5 (the independent queries now run together). Idle dashboards back off to one poll every ~15 s. |

**Bottom line:** today's deploy comfortably handles **a few dozen** people at the same moment, and judges arriving one at a time. For hundreds to 1,000, take the costed path at the end. The first step, a paid Render instance, costs $7–25/month and also removes the 30–80 s cold start.

## What "1,000 at once" means here

- 1,000 people don't all click at the same instant. The steady load comes from **polling**: every open chat (and seller inbox) fetched `GET /api/chat` every 4 s, even in a background tab. 1,000 open chats = **250 req/s**, around the clock.
- Page loads are bursty. 1,000 people each loading a page every ~20–30 s is roughly 30–50 pages/s.
- Few people actually send messages. Each message is one model turn of ~3–5 s, mostly spent waiting on Anthropic. The limits there are Anthropic's rate limits and the daily turn cap, not CPU.
- What I expected from reading the code: (1) a single small Render instance, (2) the database pool of 5 combined with the round-trip time to Neon, (3) 4-second polling with no backoff, (4) the shop page doing 5 queries plus a large render on every request, (5) the daily cap. The measurements confirmed 1, 3, 4 and 5. Item 2 matters when the database is far away (see the note on local Neon tests).

## Production: https://oja-4586.onrender.com (Render free, read-only)

These ran against the code that was deployed at the time, before the fixes below. Bursts were 20 s long and I stopped escalating once p95 went over 10 s or errors over 20%. No model calls and no writes.

| Scenario | Concurrent | req/s (all OK) | p50 | p95 | p99 | Errors |
|---|---|---|---|---|---|---|
| `GET /` (static) | 50 | 43.4 | 1.1 s | 2.0 s | 2.2 s | 0% |
| | 200 | 52.5 | 4.1 s | 5.0 s | 5.2 s | 0% |
| | 500 | 34.6 | 6.4 s | **16.3 s** | 18.1 s | **19% timeouts** → stopped |
| `GET /shop/ife-textiles` | 50 | **2.4** | **13.3 s** | **19.4 s** | 19.9 s | 6% timeouts → stopped |
| `GET /api/chat` (no conversation) | 50 | 30.3 | 1.3 s | 3.1 s | 3.6 s | 0% |
| | 200 | 33.7 | 5.0 s | 7.6 s | 8.3 s | 0% → not escalated |

- **The shop burst restarted the instance.** The next burst got 100% `502` from Render. The request after that took 11.8 s, which is a fresh boot running migrations and the seed. Memory is the likely cause: locally the server's RSS reached 670–830 MB under shop-page load, and the free plan has 512 MB. Once it was back up, the chat-poll runs above were done.
- **Cold start:** 82.8 s for the first request after the instance slept, and 32.7 s on a later wake. After that, the first request that touched the database took another ~12 s (connect, migrate, seed). The fix moves that ~12 s into boot.
- Once warm, Render and Neon are close: a single `/api/chat` takes ~0.25 s, the same as `/icon.svg`. Database round trips are not the problem in production.

## Local production build, before and after the fixes

Setup: `next build` + `next start` on a laptop. Node.js used ~1 core, and the load generator (autocannon) ran on the same machine, so absolute numbers are a rough guide only. The database was **embedded PGlite**, which runs on the same thread as the app, so its query time counts against the app's CPU. Runs were 20 s, and each run waited for the server to drain its backlog before starting. The same data set was used for before and after: the demo seed plus 200 conversations of 10 messages.

| Scenario | Concurrent | req/s before → after | p95 before → after | Errors before → after |
|---|---|---|---|---|
| (c) `GET /api/chat`, no conversation | 50 | 83 → **146** | 1.5 s → 1.1 s | 0 → 0 |
| | 200 | 139 → **186** | 2.4 s → 2.0 s | 0 → 0 |
| | 500 | 134 → **181** | 6.8 s → **3.7 s** | **24.6% → 0%** |
| | 1000 | 131 → **164** | 9.6 s → 6.6 s | **25% → 6.3%** |
| (d) `GET /api/chat`, 10-message conversation | 50 | 92 → 108 | 1.3 s → 1.3 s | 0 → 0 |
| | 200 | 105 → 116 | 2.9 s → 2.6 s | 0 → 0 |
| | 500 | 99 → 122 | 6.0 s → 5.4 s | 0 → 0 |
| | 1000 | 84 → 104 | 12.8 s → 9.9 s | 61.5% → 57.9% |
| (b) `GET /shop/ife-textiles` (not changed) | 50 / 200 / 500 | 21 / 20 / 7 → same | 4.0 / 9.9 / 17 s → same | 0 / 0 / 71% → same |
| (e) seller inbox (signed in) | 10 / 50 / 100 | 18.6 / 22.4 / 21.3 → 17.3 / 19.3 / 18.4 | 1.4 / 3.0 / 5.7 s → 1.3 / 3.1 / 6.3 s | 0 → ≤1% |
| (a) `GET /` (static, before only) | 50 / 200 / 500 / 1000 | 265 / 303 / 353 / 334 | 0.95 / 1.5 / 2.6 / 4.7 s | 0 |

- Errors at 500–1,000 connections are mostly sockets refused or reset once the server falls behind. Nothing sheds load gracefully, so the queue keeps growing. Server memory reached ~350 MB serving the home page and 850–930 MB for shop and inbox runs.
- The inbox shows no gain here because PGlite has a single in-process connection, so queries can't overlap. The fix pays off on Neon, where each of the 2 saved round trips costs real network time.
- **Model calls (POST /api/chat, real Claude turns, 36 in total):**

  | Buyers sending at once | All got an AI reply? | Slowest reply |
  |---|---|---|
  | 1 | yes | 2.9 s |
  | 5 | yes | 4.9 s |
  | 10 | yes | 4.9 s |
  | 20 | yes | 5.0 s |

  CPU is not the limit for AI chat. The limits are the daily cap and Anthropic's per-minute limits for the account's tier.

**About the local Neon run:** I first ran the local build against a Neon branch, a copy of production. From this laptop the round trip to eu-central-1 was 150–190 ms, connecting sometimes took 3–8 s, and some attempts failed with `ETIMEDOUT`. With a pool of 5, the shop page managed ~1 page/s with 61% timeouts. The server then stopped answering database routes while its CPU sat idle. That shows the pool limit well: throughput ≈ pool size ÷ (queries × round trip). But it measured my internet connection more than the app, so the before/after comparison was rerun on PGlite. The fixes below (pool sized for a pooled URL, `connect_timeout`, retrying a failed boot) target that failure mode. The branch has been deleted.

## Limits, in order of how soon they bite

1. **Render free plan:** one instance, ~0.1 CPU and 512 MB (per Render's plan page). It sleeps when idle, so the first visitor waits 30–80 s. Memory runs out under page-load bursts. There is no horizontal scaling.
2. **Polling** used to be 250 req/s per 1,000 open chats, with no pause for hidden tabs. This is fixed; see below.
3. **The shop page** is rendered per request: 5 queries and a 60 KB render, ~50 ms of CPU. That is about 20 pages/s per full core and ~2.4/s on the free instance.
4. **Daily model-turn cap:** 400 turns a day for the whole app (`OJA_DAILY_TURN_CAP`). This is the real ceiling for "people chatting with the AI".
5. **Anthropic rate limits:** requests and tokens per minute depend on the account's usage tier (check the Console). 20 at once was fine.
6. **In-memory rate limits:** these are per instance, so with N instances the effective limit is N times higher. The per-IP chat limit (60 per 10 min) is shared by everyone behind one NAT, which matters at a demo venue.
7. **Database pool:** the old pool of 5 connections over a direct URL gave throughput of 5 ÷ (queries × round trip). That is fine next to Render (~ms) and bad from far away. Neon's smallest compute caps direct connections at roughly 100.
8. **Neon compute:** the branch autoscales from 0.25 to 2 CU and was not the bottleneck at these loads.

## Fixes made (all tests pass: `pnpm test` 57/57, `tsc --noEmit` clean)

- **`src/app/use-poll.ts`:** same API. Polling stops while the tab is hidden and fetches immediately when the tab comes back. After 3 unchanged polls it backs off ×1.5 each time, from 4 s up to 15 s. It snaps back to 4 s on a change, on `reload()`, and on `setData()` (which is called after the buyer sends, so the reply still arrives quickly). Each wait has ±15% jitter. It still stops on 401.
- **`src/app/api/chat/route.ts` (GET):** the shop and conversation now come from one join, followed by one query that selects only the visible columns. Discarded messages are no longer fetched. No conversation = 1 query (was 2); with a conversation = 2 (was 3). The response is identical. Covered by the new `src/app/api/chat/route.test.ts` (shape, drafts, needs-human, discarded messages, language).
- **`src/app/api/vendor/[slug]/inbox/route.ts`:** conversations, orders and events are fetched in parallel, and discarded messages are filtered in SQL. 3 round trips instead of 5, same response.
- **`src/db/index.ts`:**
  - Pool size is 20 on Neon's pooled (`-pooler`) URL and 10 on a direct URL; `DB_POOL_MAX` overrides it.
  - `idle_timeout: 30` lets Neon scale to zero, and `connect_timeout: 15` is set.
  - New optional `DATABASE_URL_UNPOOLED`: when set, migrations run over that direct connection, and the app runs on `DATABASE_URL` (the pooled one).
  - A failed first boot (for example Neon waking up) is retried on the next request instead of being cached forever.
- **`src/instrumentation.ts` (new):** starts the DB connect, migrate and seed as the server boots, without blocking it, so the first shop or chat visitor doesn't pay the extra ~12 s. It is skipped during `next build`.
- **`src/lib/ratelimit.ts`:** capped at 10,000 keys with least-recently-hit eviction. The old code cleared every key at 10,000, so anyone could reset all limits by sending 10,000 fresh keys. The file now documents that limits are per instance. Covered by the new `src/lib/ratelimit.test.ts`.
- **`scripts/load/`:** `bench.mjs` (autocannon scenarios with p50/p95/p99, RSS and CPU), `suite.sh` (local matrix with drain and stop rules), `prod.sh` (polite read-only bursts), `seed-conversations.mjs` (Neon branch or PGlite), `chat-model.mjs` (N simultaneous AI messages).

**Not done (recommended):**
- **Indexes.** `drizzle/0002` from another agent already exists and `schema.ts` was off-limits, so no migration was added. These go in the next migration:
  - `events (type, created_at)`: the daily-cap count scans every event on each turn.
  - `orders (vendor_id, created_at)`
  - `conversations (vendor_id, last_buyer_message_at)`
- **Shop page caching:** the catalog, reviews and zones could use `"use cache"` with a short `cacheLife` and a tag that seller edits invalidate.
- **Query timeout:** add a statement timeout so a stuck connection can't hang requests.

## Path to real scale (costs are list prices as I know them; verify before buying)

| Step | Cost | What it gets you |
|---|---|---|
| 1. Render **Starter** ($7/mo, 0.5 CPU, 512 MB) or **Standard** ($25/mo, 1 CPU, 2 GB) | $7–25/mo | No sleep and no 30–80 s cold start. ~5–10× the CPU. Standard's memory survives page bursts. On Standard this is roughly 1,000 idle open chats and ~20 shop pages/s. |
| 2. Neon **pooled** `DATABASE_URL` + `DATABASE_URL_UNPOOLED` for migrations (code ready) | free | Thousands of client connections through PgBouncer, so instances can be added safely. |
| 3. 2–3 instances behind Render's load balancer + **shared rate-limit store** (Upstash Redis free tier, or a Postgres table) | +$25–50/mo | Horizontal scale. Rate limits stay correct across instances. |
| 4. Cache the shop page (`"use cache"` + tag invalidation) | dev time | Shop page close to static: hundreds of pages/s per core. |
| 5. Replace polling with **SSE or Neon Realtime** (live queries) | dev time (+ Realtime pricing) | Idle chats cost ~0 req/s, and replies are instant. |
| 6. Queue model turns (Postgres job table or Upstash QStash) | dev time | Smooths bursts against Anthropic limits. Buyers see "typing…" instead of errors. |
| 7. Higher **Anthropic tier** + a higher `OJA_DAILY_TURN_CAP` | spend-based | Sets the real ceiling for concurrent AI conversations. |

## Owner decisions

1. **Before judging: upgrade Render to Starter or Standard?** This is the biggest, cheapest win, and it removes the cold start judges would otherwise hit.
2. **Daily turn cap:** 400 a day across the whole app. Raise it for the judging window if you expect many testers.
3. **Switch Render's `DATABASE_URL` to Neon's pooled URL** and add `DATABASE_URL_UNPOOLED` (the direct URL). Nothing else needs to change.
4. **Indexes migration:** after the `publicHandle` migration lands, it needs a `schema.ts` change.
5. **Shop-page caching:** this belongs to whoever owns `src/app/shop/**`.

## Re-running

```sh
npm i --prefix .load-deps autocannon@8 && export AUTOCANNON_DIR=.load-deps
# local: NEXT_DIST_DIR=.next-load npx next build && NEXT_DIST_DIR=.next-load PORT=3102 npx next start -p 3102
scripts/load/suite.sh http://localhost:3102 <server-pid> after out.jsonl sessions.txt 20
scripts/load/prod.sh https://oja-4586.onrender.com prod.jsonl     # read-only; be polite
node scripts/load/chat-model.mjs --base http://localhost:3102 --waves 1,5   # costs money
```
