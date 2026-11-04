# Oja — MVP tracker

Scope and reasons: [PRD.md](PRD.md). Tick items here as they land; one line of notes each.
Legend: ⬜ todo · 🟡 in progress / partly done · ✅ done · ⛔ blocked (says on what)

**Days left:** Nov 4 → Nov 12 (submit by 9:00 PM Lagos). Internal draft Nov 11. **Feature freeze: end of Nov 8.**

## Blockers (needed from samjay8)

| Item | Needed for | Status |
|---|---|---|
| `ANTHROPIC_API_KEY` in `.env.local` | Any live agent test | ⛔ |
| PayPal sandbox app client ID + secret | Checkout, capture, tracking | ⛔ |
| Sandbox **personal** (buyer) account email + password | README for judges, E2E test | ⛔ |
| Neon `DATABASE_URL` | Hosted demo | ⛔ |
| Render login | Hosted demo | ⛔ |
| Meta developer app + WhatsApp test number | S1 only | ⛔ (should-have) |
| Sheet access (temporary link share or CSV) | New interview response | ⛔ |

## Day plan

### Wed Nov 4: plan + first live run
- ✅ PRD + this tracker
- ✅ MIT `LICENSE`
- ⬜ Read the new interview response; update findings
- ⛔ Live sandbox E2E: chat → haggle → checkout → approve → capture → ship (needs keys)
- ⬜ Fix whatever the live run breaks

### Thu Nov 5: hosted + hardened
- ⬜ Neon database, Render web service from `render.yaml`, `APP_URL` set
- ⬜ Spend cap: daily model-call budget; past it, chats go to the seller
- ⬜ PayPal webhook backup (S2)
- ⬜ Browser pass on the inbox and chat (mobile width too)

### Fri Nov 6: prove the safety story
- ⬜ Adversarial haggling suite against the live agent (S3), results table in README
- ⬜ Follow-up nudge (S5) if time
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
- 2026-11-04: PRD + tracker + LICENSE. Credentials still empty; Sheet restricted (new response unread).
