# Verified facts, competitors and open questions

Status key: ✅ verified from a primary or official source · ⚠️ secondary sources only · ❓ unknown.
Checked 2026-10-26. **Re-verify anything that goes into the pitch or video.**

## PayPal

| Fact | Status | Source |
|---|---|---|
| Nigerians can receive PayPal from 200+ countries and withdraw in naira/USD via a Paga link, live 2026-01-27. SMEs onboard through PayPal's merchant platform, then settle via Paga. Funding PayPal from Paga is "coming soon". | ✅/⚠️ | https://www.mypaga.com/home/pagapaypal · https://techcabal.com/2026/01/27/paypal-returns-to-nigeria-after-two-decades-this-time-through-paga/ · https://nairametrics.com/2026/01/27/paypal-goes-live-in-nigeria-through-paga-enabling-global-payments-and-local-withdrawals/ |
| Backlash/boycott around the relaunch | ⚠️ | https://www.bellanaija.com/2026/01/paypal-paga-nigeria-return-boycott/ |
| PayPal does **not** support NGN as a transaction currency | ⚠️ secondary only | https://wordpress.org/support/?p=8068040 · https://www.godaddy.com/help/supported-payment-methods-by-payee-countries-n-t-41014 |
| Paga/PayPal fees for Nigerian receivers | ❓ unpublished | — |
| Held funds: with an **approved carrier** + tracking, released about **24h after the courier confirms delivery**; services/digital goods 7 days after marked Completed; rarely up to 21 days | ✅ | https://www.paypal.com/smarthelp/article/faq3289 |
| Seller Protection (physical goods): verifiable tracking, ship date, recipient address matching the transaction; proof of delivery = "delivered" status + date; carrier choice matters internationally | ✅ | https://www.paypal.com/legalhub/seller-protection |
| Invoices allow instalments: `configuration.partial_payment.allow_partial_payment` + `minimum_amount_due`; **not available in India, Brazil, Israel** | ✅ | https://developer.paypal.com/api/invoicing/v2/definitions/partial_payment · https://developer.paypal.com/platforms/invoicing/integrate.md |
| Authorization: 29-day validity, 3-day honor period, reauthorize within 29 days; partial and multiple captures allowed; capture up to 115% or +$75 (lesser) | ⚠️ PayPal docs, partly legacy | https://developer.paypal.com/beta/payments/authorize-capture · https://docs.paypal.ai/payments/methods/paypal/delayed-capture |
| Sandbox lets you choose the country for test accounts; **whether NG is listed is unknown** | ❓ | https://developer.paypal.com/api/rest/sandbox/accounts |
| Whether a Nigerian PayPal USD balance can pay a Nigerian vendor | ❓ | — |
| Agent Toolkit tool list, install, sandbox config | ✅ | [../reference/vendor/paypal-agent-toolkit-README.md](../reference/vendor/paypal-agent-toolkit-README.md) |

## Nigeria context

| Fact | Status | Source |
|---|---|---|
| Naira-card dollar limits raised in 2026, bank-dependent and subject to change: GTBank $40k/quarter (Aug 2026), FirstBank $10k/quarter, Access $2–3k/month, Zenith ~$50k/year | ⚠️ press | https://nairametrics.com/2026/09/07/gtco-firstbank-others-raise-dollar-spending-limits-as-fx-scarcity-eases/ · https://www.legit.ng/business-economy/money/1724047-nigerian-banks-increase-international-card-spending-limits/ |
| Nigeria Data Protection Act 2023 applies to buyer data | from memory, not checked this session | — |

## Meta channels

See [../reference/meta-channels.md](../reference/meta-channels.md).

## Cross-border

| Fact | Status | Source |
|---|---|---|
| US de minimis ($800) suspended for all countries since 2025-08-29; continued Feb 2026; CBP rules June/July 2026; upheld by the Court of International Trade 2026-08-13 | ⚠️ law firm / trade press | https://www.gtlaw.com/ar/insights/2026/6/us-trade-developments-ieepa-refund-processing-de-minimis-suspension-and-section-301-investigation-against-germany · https://www.rvia.org/news-insights/united-states-court-international-trade-cit-upholds-suspension-de-minimis |

## Competitors

| Who | What it does | Gap Oja targets | Source |
|---|---|---|---|
| **Meta Business Agent** (global since 2026-06-03; 1M+ businesses) | WhatsApp/IG/Messenger: answers questions, recommends from catalog, books, qualifies leads, hands off to a human. Free at launch; reportedly moving to paid tiers (sources conflict). Enterprise platform connects to Shopify/Zendesk/Shopee. | Coverage we read doesn't mention payments, invoices, negotiation, cross-border, or web chat outside Meta | https://techcrunch.com/2026/06/03/metas-ai-agent-for-whatsapp-business-is-now-available-globally/ · https://greentick.ai/blogs/meta-business-agent-whatsapp/ |
| **Bumpa** (Nigeria) | IG/FB/WhatsApp DM inbox, invoices, payment requests; commission + subscription; "retail automation, not fintech" | Local payments only; no PayPal cross-border protection or bounded AI haggling (as far as found) | https://techcrunch.com/2022/10/19/nigerian-retail-automation-platform-bumpa-raises-4m-led-by-base10-partners · https://www.techloy.com/nigerian-startup-bumpa-raises-4-million-seed-funding/ |
| Aso-ebi platforms: Event Parcel, Eventus, Asoebi Assist, Asoebi Logistics ($7/guest), Travo.ng | Host-side forms, payment tracking, shipping coordination | Form-based, host-side; Oja is vendor-side, in chat, PayPal for buyers abroad | https://eventparcel.com/ · https://eventus.cc/blog/asoebi-made-easy-how-eventus-simplifies-fabric-selection-payments-and-distribution · https://asoebilogistic.com/ |
| Hackathon chat-to-pay / agent-ready entries | Generic | — | see [idea-history.md](idea-history.md) |

## Open questions (resolve before the pitch is locked)

1. ⚠️ **Interviews:** batch 1 (n=5, all in Nigeria): see [interview-findings-2026-10-29.md](interview-findings-2026-10-29.md). Buyer trust pain is strong; seller payment pain is weak; delivery is the #1 loss; cross-border is unproven. Diaspora respondents are still needed.
2. ⚠️ Meta's **own** WhatsApp Business Solution Terms text ("AI Providers" section, effective 2026-01-15): confirm a single-business sales agent is allowed.
3. ⚠️ PayPal official currency list: is NGN unsupported?
4. ❓ Can the sandbox create an NG business account?
5. ❓ Paga/PayPal fees.
6. ✅ ~~Do the rules allow non-PayPal rails?~~ Yes: "Third Party Integrations" are allowed if authorized; PayPal must stay central.
7. ❓ Can a Nigerian PayPal USD balance pay a Nigerian vendor?
8. ⚠️ Meta brand rules for showing WhatsApp/IG/FB in the video (rules forbid third-party trademarks without permission).
9. ❓ Does Meta Business Agent do payments anywhere (e.g. WhatsApp Pay markets)? Re-check before claiming the gap.
