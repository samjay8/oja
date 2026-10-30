# Oja threat model (consolidated 2026-10-26)

Severity: 🔴 critical / existential · 🟠 high · 🟡 medium. Facts behind these are in [verified-facts.md](verified-facts.md).

## Order flow: where a sale can fall through

| Stage | What breaks | Guard |
|---|---|---|
| 1. Ask | No reply; invented answer | Instant reply; prices and stock **only from the catalog**, otherwise "I'll confirm with the vendor" |
| 2. Quote | Exchange rate moves; shipping missing; US duty surprise | Quote valid until a set time; shipping included; "import duties may apply" for US/UK/EU |
| 3. Haggle | Selling below cost; prompt injection in text or images | **Minimum price enforced in code**; the AI never sets amounts; 50+ adversarial tests |
| 4. Confirm | Wrong size or colour → "not as described" | Buyer-confirmed summary (items, measurements, address) stored as evidence |
| 5. Pay | Wrong rail; instalments in India/Brazil/Israel; fake transfer screenshot | Payment router; instalments by country; **only the vendor confirms a bank transfer** |
| 6. Stock | Same last item sold on two channels | One inventory, reserved at checkout |
| 7. Ship | Carrier can't prove delivery abroad → no Seller Protection | Approved tracked carriers; flag high-value orders; `create_shipment_tracking` |
| 8. Funds | New-seller hold | Approved carrier + tracking → release ~24h after delivery |
| 9. After the sale | Expensive cross-border returns; disputes | Return terms in the quote; dispute evidence from chat (`get_dispute`) |
| 10. Come back | Meta's 24h window closes | PayPal invoice reminder emails; WhatsApp templates only if the vendor opts in |

## Market and competition

| Threat | Sev | Mitigation |
|---|---|---|
| Meta Business Agent (free or cheap, built in, 1M+ businesses) | 🔴 | Compete where it doesn't (per coverage): payments, protection, bounded haggling, cross-border, web chat. If Meta adds payments → being PayPal-native and off-Meta. |
| Cross-border share of sales too small | 🟠 | Interviews decide; if weak, fall back (see [idea-history.md](idea-history.md)) |
| PayPal fees vs LemFi/Wise for repeat buyers | 🟠 | Win the first, riskiest sale; repeat buyers leaving is acceptable; no fee numbers until verified |
| Vendors distrust PayPal (frozen-funds history) | 🟠 | Seller-protection features are the answer; show money landing in Paga |
| Onboarding friction (PayPal business account + Paga link + identity checks) | 🟠 | Guided onboarding; sandbox in the hackathon |
| AI rude to an aunty / robotic Pidgin | 🟠 | Tone set per vendor; instant human takeover; test with real vendors |

## Platforms

| Threat | Sev | Mitigation |
|---|---|---|
| WhatsApp "AI Providers" terms | 🟠 | Business-scoped sales agent (believed allowed); read Meta's own text |
| IG/Messenger App Review blocks a public launch | 🟠 | Development mode for the hackathon; say so in the submission |
| WhatsApp test number = 5 recipients | 🟡 | Judges use the web chat |
| Sandbox can't create an NG merchant | 🟡 | Generic sandbox merchant + explanation |
| Same buyer on two channels | 🟠 | Link by phone/email at checkout; vendor can merge |

## AI

| Threat | Sev | Mitigation |
|---|---|---|
| Invented prices, stock or dates | 🔴 | Catalog-only answers; deterministic fallback |
| Haggling exploited / prompt injection (including text inside images) | 🔴 | Minimum price in code; the AI never sets money; adversarial suite shown in the video |
| Measurement errors | 🟠 | Confirmed summary = evidence |
| Local-language over-claiming | 🟡 | Claim English + Pidgin only |

## Security and privacy

| Threat | Sev | Mitigation |
|---|---|---|
| Vendor impersonation with cloned links | 🟠 | Links only on the vendor's own page or domain; PayPal checkout shows the verified payee name |
| Webhook spoofing / double recording | 🟠 | Verify webhook signatures; `PayPal-Request-Id` idempotency; state machine with unique constraints |
| Agent over-permissioned on PayPal | 🟠 | Toolkit `actions` least privilege; refunds need a human |
| Secret leakage | 🟠 | Server-side only; `.env.example`; sandbox-only credentials in the README |
| Buyer data (measurements, addresses): Nigeria Data Protection Act 2023 / GDPR | 🟠 | Collect only what's needed; encrypt per vendor; delete option; privacy page |
| Prohibited goods (PayPal Acceptable Use Policy) | 🟡 | Screen the catalog during onboarding |

## Hackathon execution

| Threat | Sev | Mitigation |
|---|---|---|
| Scope: 4 channels + flow in 16 days | 🔴 | Must: web chat + WhatsApp + full flow; IG/Messenger after the day-10 freeze only |
| Video uses third-party trademarks | 🟠 | Lead with our web chat; check Meta brand rules; no copyrighted music |
| Demo goes down or LLM bill spikes during judging (to Dec 15) | 🟠 | Always-on host, rate limits, budget cap, token auto-refresh |
| Judges can't run it | 🟠 | Hosted URL + seeded judge-mode vendor + setup instructions with sandbox credentials |
| Someone ships the same idea | 🟡 | Re-check GitHub on days 5 and 10 |
| Late submission | Fatal | Draft by Nov 11; hard stop Nov 12 9:00 PM WAT |
