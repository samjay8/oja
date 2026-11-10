# Oja — MVP tracker

Scope and reasons: [PRD.md](PRD.md). Tick items here as they land; one line of notes each.
Legend: ⬜ todo · 🟡 in progress / partly done · ✅ done · ⛔ blocked (says on what)

**Now:** Wed Nov 11 (final build day). **Submit by Thu Nov 12, 9:00 PM Lagos (12:00 PM PT).** The Nov 5–10 plan below slipped; the **Crunch plan** replaces it.

## Crunch plan (Nov 11–12)

### Wed Nov 11: build it all
- 🟡 Aró design system: tokens, fonts, patterns, UI kit (`globals.css`, `components/ui.tsx`) ✅; pages being restyled
- 🟡 Buyer side: landing, shop, chat with language picker (agent 1)
- 🟡 Seller desk: shell, inbox restyle + Translate, catalog editor, settings, channels page (agent 2)
- 🟡 Channels + languages backend: one Meta webhook (WhatsApp/Messenger/Instagram), connect API, encrypted tokens, chat language, translate API, daily spend cap (agent 3)
- ✅ PRD reframed: web first → launch on channels; languages; design system; scaling
- ⛔ Live PayPal sandbox E2E (needs client ID + secret)
- ⛔ Live Claude run (needs `ANTHROPIC_API_KEY`)
- ⬜ Integrate + build + browser check + commit

### Thu Nov 12: ship
- ⬜ Deploy: Neon + Render, `APP_URL`, env vars
- ⬜ README final with sandbox buyer login; repo **public**; licence detected
- ⬜ Video < 3:00 (web chat first; no Meta logos; English subtitles for other languages)
- ⬜ Devpost text + submit **before 9:00 PM Lagos**


## Blockers (needed from samjay8)

| Item | Needed for | Status |
|---|---|---|
| `ANTHROPIC_API_KEY` in `.env.local` | Final model (Claude) | ✅ Opus 5.5 live, 4–9 s replies |
| Sandbox **personal** (buyer) account password | README for judges, E2E test | ✅ in README |
| Sandbox REST app "Oja" → client ID + secret | Checkout | ✅ in `.env.local`; real sandbox order OJA-4EADTH created, $114.00 matched, payee = business account |
| Neon `DATABASE_URL` | Hosted demo | ⛔ |
| Render login | Hosted demo | ⛔ |
| Meta developer app (app secret, webhook verify token) + a test Page / IG account / WhatsApp test number | Live channels (M15 works without; S1 needs it) | ⛔ |
| Sheet back to **Restricted** (has contact details) | Privacy | ⬜ |
| Book R6 follow-up call (cross-border volume, countries) | Pitch evidence | ⬜ |

## Day plan

### Wed Nov 4: plan + first live run
- ✅ PRD + this tracker
- ✅ MIT `LICENSE`
- ✅ Read R6; findings addendum + PRD numbers updated
- ⛔ Live sandbox E2E: chat → haggle → checkout → approve → capture → ship (needs keys)
- ⬜ Fix whatever the live run breaks

### Thu Nov 5: hosted + hardened
- ⬜ Neon database, Render web service from `render.yaml`, `APP_URL` set
- ⬜ Spend cap: daily model-call budget; past it, chats go to the seller
- ⬜ PayPal webhook backup (S2)
- ⬜ Browser pass on the inbox and chat (mobile width too)

### Fri Nov 6: prove the safety story
- ⬜ Adversarial haggling suite against the live agent (S3), results table in README
- ⬜ Follow-up nudge (S5): promoted, 4/6 lose sales to quiet buyers
- ⬜ WhatsApp test number live (S1)

### Sat Nov 7: product completeness
- ⬜ Seller catalog editor (S4): products, list/min price, delivery zones
- ⬜ **Decide sponsor prize** (AG Grid ledger vs Render) → build it if AG Grid

### Sun Nov 8: polish → FREEZE
- ⬜ UI polish, empty states, error states, copy pass
- ⬜ Prompt tuning from real transcripts (tone, Pidgin, brevity)
- ⬜ Model choice check: Opus 5.5 vs Sonnet 5.5 on the same scripts
- 🧊 Feature freeze at end of day

### Mon Nov 9: story
- ⬜ Video script (problem → who → live sale → money protected → why PayPal), < 3:00, no copyrighted music, English subtitles
- ⬜ Record + edit

### Tue Nov 10: submission assets
- ⬜ README final (features, PayPal APIs used, how to run, sandbox logins, architecture)
- ⬜ Devpost text drafted
- ⬜ Repo made **public**; check GitHub detects the MIT licence

### Wed Nov 11: internal deadline
- ⬜ Full Devpost draft saved with video + links
- ⬜ Fresh-eyes judge test: new browser, hosted URL, README only

### Thu Nov 12: buffer
- ⬜ Final fixes only; **submit before 9:00 PM Lagos**
- ⬜ Confirm the hosted demo stays up through Dec 15

## Must-have checklist (from the PRD)

| # | Item | Status | Notes |
|---|---|---|---|
| M1 | Web chat | 🟡 | Built; needs live agent |
| M2 | Catalog-only answers | 🟡 | Built; needs live agent |
| M3 | Haggling with floor, tiers, loyalty | ✅ | `pricing.test.ts` |
| M4 | Delivery quote | ✅ | `delivery.test.ts` |
| M5 | PayPal checkout + capture + amount check | 🟡 | Stubbed tests pass; sandbox run pending |
| M6 | Tracking to PayPal | 🟡 | Stubbed; sandbox run pending |
| M7 | Seller inbox | 🟡 | Built; browser test pending |
| M8 | Naira rail | ✅ | `commerce.test.ts` |
| M9 | Money guard | ✅ | `guard.test.ts` |
| M10 | Judge-mode shop + sandbox login | 🟡 | Seed done; login missing |
| M11 | Hosted, up to Dec 15 | ⬜ | |
| M12 | Rate limit + spend cap | 🟡 | Spend cap todo |
| M13 | Submission package | 🟡 | LICENSE done |

## Submission checklist (from the rules)

- ⬜ Public GitHub repo with all source and instructions
- ✅ MIT LICENSE at repo root (check it's detected in About once public)
- ⬜ README: features, PayPal usage, run steps, **sandbox test credentials**
- ⬜ Hosted URL works without login for the buyer side
- ⬜ Video < 3:00 on YouTube, public, no third-party trademarks or copyrighted music
- ⬜ Devpost description: problem, who, how it works, PayPal APIs, AI, what's next
- ⬜ English throughout (subtitles for any Pidgin/Yoruba)

## Log

- 2026-10-30: Scaffold committed (`6941dcd`), pushed to private `samjay8/oja`. 18 tests green.
- 2026-11-04: PRD + tracker + LICENSE. Read R6 (electronics, 100+ orders/mo, most buyers abroad, still uses Meta's agent). Credentials still empty.
- 2026-11-05: Provider switch (`OJA_PROVIDER=anthropic|gemini`, `src/lib/llm.ts`). First live agent run on Gemini 3.5 Flash: quoted delivery upfront, held the floor ($76 → $73 vs $68 floor), refused a "$20 from the owner" injection. Replies 7–72 s (overload + retries). Free-tier quota ran out after ~15 turns.
- 2026-11-11: Reframe: web first, launch agent on WhatsApp/Messenger/Instagram, 8 languages (EN, Naijá, Yorùbá, Hausa, Igbo, FR, DE, ZH). Aró design system. Work split across 3 parallel agents (buyer UI, seller desk, channels+languages backend). Sandbox accounts created by user (business + personal); app credentials still needed.
- 2026-11-11: Gemini removed (code, dependency, keys). Claude Opus 5.5 is the only model; it also runs all 8 languages and seller translations.
