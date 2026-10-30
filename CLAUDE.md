# Oja — PayPal AI Hackathon 2026 entry

AI sales agent that closes chat sales (web chat + WhatsApp/Instagram/Messenger) and collects and protects payment through PayPal. Status: building (started 2026-10-30). Interview batch 1 in `docs/research/interview-findings-2026-10-29.md`.

**Deadline: Thu Nov 12, 2026, 12:00 PM PT (9:00 PM Lagos). Internal draft deadline Nov 11.**

## Read before working

- `docs/hackathon-rules.md`: official rules, **verbatim, binding**. Check here before any scope, video, licensing or submission decision.
- `docs/rules-checklist.md`: what the rules mean for this project (must-haves, prize stacking, judging).
- `docs/research/oja-decision.md`: the current idea, scope and payment router.
- `docs/research/verified-facts.md`: facts with sources and status, plus open questions. **Don't state unverified items as fact.**
- `docs/research/threat-model.md`: risks and mitigations.
- `docs/research/idea-history.md`: rejected ideas and why (don't re-propose them).
- `docs/research/interview-guide.md`: user research script.
- `docs/reference/paypal.md`, `docs/reference/meta-channels.md`, `docs/reference/hackathon-overview.md`; official PayPal READMEs in `docs/reference/vendor/`.

## Code map

- `src/lib/pricing.ts` haggling and floors · `delivery.ts` zone quotes · `guard.ts` money/link guard · `money.ts` minor units
- `src/lib/commerce.ts` offers, orders, capture check, shipping (all DB rules) · `paypal.ts` Agent Toolkit called from code
- `src/lib/agent.ts` Claude tool runner; tools are Oja's own, never PayPal's directly
- `src/lib/channels/` WhatsApp adapter · `src/app/api/` chat, vendor, WhatsApp webhook · `src/app/pay/` PayPal return/cancel
- `src/db/` Drizzle schema, PGlite fallback, demo seed · `pnpm test` runs the flow on in-memory Postgres
- Next.js 16 with `cacheComponents`: read `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md)

## Non-negotiables

- The AI never sets money amounts: prices, minimum prices and captures are enforced in code.
- PayPal sandbox only; no live secrets in the repo.
- No Claude/AI co-author trailers in commits or PRs.
