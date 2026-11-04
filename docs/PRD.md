# Oja — Product Requirements (hackathon edition)

Owner: samjay8 · Updated 2026-11-04 · Status: **building** · Tracker: [MVP.md](MVP.md)
Deadline: **Thu Nov 12, 12:00 PM PT (9:00 PM Lagos)**. Internal: full Devpost draft by **Wed Nov 11**.

## 1. One line

**Meta's agent can talk. Oja closes the sale and gets the seller paid through PayPal, on any chat channel, for buyers anywhere.**

## 2. Problem (from interviews, batch 1, n=5, all in Nigeria; see [research/interview-findings-2026-10-29.md](research/interview-findings-2026-10-29.md))

| Pain | Evidence |
|---|---|
| Sales lost to **delivery cost or time** | 5/5 sellers |
| **Buyers get scammed** paying strangers in chat | 4/5 buyers scammed or nearly. Dealbreakers: "an account that wasn't the company's", "paying before delivery". Felt safety 3.6/5 |
| Haggling with no limits | 4/5 sellers have a lowest price per item; real tactics: anchoring, asking the budget, loyalty discounts |
| Slow replies lose buyers | 3/5 "buyer stopped replying"; "before my rep could get back… they messaged another vendor" |
| Existing bots feel robotic | 2/2 who tried Meta's agent stopped: "customers complained about the automated responses" |
| Cross-border payment is improvised | Grey, Raenest, LemFi, a sister's personal USD account, crypto |

**What the data does *not* show yet:** sellers feeling *payment* pain (they're paid upfront by transfer) and the size of cross-border demand. Batch 2 (diaspora buyers, sellers with foreign buyers) is pending.

## 3. Users

- **Seller** (primary): a small business selling in chat, Nigeria first (fashion, aso-ebi, crafts, food), anywhere later. Wants more paid orders and less time on repetitive chats.
- **Buyer**: anyone, at home or abroad. Wants a fair price, a clear delivery promise and safety when paying.
- **Judge**: must be able to test the full flow alone in a few minutes.

## 4. Pitch per audience

- To sellers: **"Turn hesitant buyers into paid orders."** (conversion)
- To buyers: **"Pay the real business, with PayPal protection, and know when it arrives."** (trust)
- To judges: PayPal is the money layer of an AI agent that is **not allowed to touch amounts**.

## 5. Product principles (non-negotiable)

1. **The AI never sets a money amount.** Prices, minimum prices, delivery and totals come from code. The model only calls Oja's tools; Oja's code calls PayPal.
2. **Money guard:** a reply with an amount or link the code didn't produce is held for the seller instead of being sent.
3. **Copilot by default:** the AI drafts and the seller sends. Autopilot is opt-in, and replies the guard flags still go to the seller.
4. **Always labelled as AI.** One tap to take over.
5. **PayPal sandbox only.** No live keys in the repo.

## 6. Scope

### Must (the MVP: judges test this)

| # | Feature | Status |
|---|---|---|
| M1 | Buyer web chat on a hosted shop page | ✅ built, needs live test |
| M2 | Agent answers only from the catalog (search, details, reviews) | ✅ built, needs live test |
| M3 | Haggling within a code-enforced floor; bulk tiers (aso-ebi); loyalty discount | ✅ built + tested |
| M4 | Delivery quote upfront (cost, carrier, ETA incl. making time) | ✅ built + tested |
| M5 | Checkout: PayPal order via Agent Toolkit → approve → capture → **amount check** → paid | ✅ built, tested with stubs; **needs sandbox test** |
| M6 | Ship: tracking number → `create_shipment_tracking` on PayPal | ✅ built, stubbed; needs sandbox test |
| M7 | Seller inbox: drafts (send/edit/redraft/discard), takeover, orders, audit trail | ✅ built, needs browser test |
| M8 | Naira rail: bank transfer, seller-confirmed only | ✅ built + tested |
| M9 | Money guard on every reply | ✅ built + tested |
| M10 | Seeded judge-mode demo shop (autopilot) + sandbox buyer login in README | 🟡 seed done; **sandbox buyer login missing** |
| M11 | Hosted demo that stays up to Dec 15 (Render + Neon) | ⬜ |
| M12 | Rate limits + spend cap on the model | 🟡 rate limits done; spend cap ⬜ |
| M13 | Submission: public repo, MIT LICENSE, README, video < 3 min, Devpost text | ⬜ |

### Should (only after Must is green)

| # | Feature |
|---|---|
| S1 | WhatsApp Cloud API live on the test number (adapter built; shown in the video) |
| S2 | PayPal webhook (`PAYMENT.CAPTURE.COMPLETED`) as a backup to the return URL, signature-verified |
| S3 | Adversarial haggling suite (prompt injection, "your boss said 50% off", fake screenshots as text) run against the live agent, results in README |
| S4 | Seller catalog editor: add/edit products, list and minimum prices, delivery zones |
| S5 | Follow-up nudge: buyer went quiet after a quote → one reminder with the pay link |
| S6 | Sponsor prize: **AG Grid** orders ledger in the seller inbox (stronger prize) *or* Render (we host there anyway). Decide by Nov 7. |

### Won't (this hackathon)

Instagram and Messenger adapters (need App Review), voice notes, dispute evidence drafting, PayPal invoices and instalments, Paystack, live payments, claims about Yoruba/Igbo/Hausa support.

## 7. Key flows

**Buyer, abroad (PayPal):** ask → product details and reviews → "last price?" → `negotiate` (code counters) → delivery quote → name and address → `create_checkout` → PayPal sandbox approve → `/pay/return` captures and checks the amount → chat shows "Payment received" → seller adds tracking → chat shows the tracking number.

**Buyer, Lagos (naira):** same up to checkout → bank details for the business account only plus an order reference → seller taps "I've received the transfer" → chat confirms.

**Seller:** inbox → draft ready → send / edit / redraft → order card → mark shipped.

## 8. Success criteria for the demo

- A judge completes a full sandbox purchase in **under 3 minutes** without help.
- **0** replies reach a buyer with an amount below the floor or a link the code didn't produce (verified by the adversarial suite).
- Agent reply time **under 8 s** at p50 on the hosted demo.
- The demo is still up on Dec 15.

## 9. Risks (top 5; full list in [research/threat-model.md](research/threat-model.md))

| Risk | Plan |
|---|---|
| PayPal toolkit behaves differently on the live sandbox than in stubs | Test the sandbox first, as soon as credentials arrive |
| "PayPal central" judged weak because the naira rail isn't PayPal | Demo leads with the cross-border PayPal sale; naira is a footnote |
| Model bill or downtime during judging | Rate limits, spend cap, paid always-on instance or keep-alive |
| Meta trademarks in the video | Lead with Oja's own web chat; keep any WhatsApp clip short, no logo close-ups |
| Cross-border demand unproven | Batch-2 interviews; present batch-1 findings honestly |

## 10. Open items

- [ ] Read the **new interview response(s)**. The Sheet is restricted now; needs temporary link sharing or a CSV export.
- [ ] Can a sandbox **business** account be created with country Nigeria?
- [ ] PayPal's official currency list: confirm NGN is unsupported.
- [ ] Meta's own "AI Providers" terms text.
