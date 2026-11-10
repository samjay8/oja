# Oja — Product Requirements (hackathon edition)

Owner: samjay8 · Updated 2026-11-11 · Status: **final build day** · Tracker: [MVP.md](MVP.md)
Deadline: **Thu Nov 12, 12:00 PM PT (9:00 PM Lagos)**. Internal: full Devpost draft by **Wed Nov 11**.

## 1. One line

**Meta's agent answers. Oja closes the sale and gets the seller paid through PayPal, on any chat channel, in the buyer's language, for buyers anywhere.**

### Product model (reframed 2026-11-11)

1. **Web first.** Every seller gets an Oja shop page with a web chat: buyers talk to the seller's AI agent and to the seller, in one thread.
2. **Launch where your buyers are.** From the seller desk, the seller launches the same agent on **WhatsApp, Messenger or Instagram**, picking whichever channels bring the most customers. More channels (Telegram, TikTok, SMS) get added as demand shows up.
3. **Speak the buyer's language.** The agent chats in English, Naijá (Pidgin), Yorùbá, Hausa, Igbo, French, German and Chinese. The seller reads any message translated into their own language.

## 2. Problem (from interviews, n=6, all in Nigeria; see [research/interview-findings-2026-10-29.md](research/interview-findings-2026-10-29.md))

| Pain | Evidence |
|---|---|
| Sales lost to **delivery cost or time** | 5/6 sellers |
| **Buyers get scammed** paying strangers in chat | 4/6 buyers scammed or nearly. Dealbreakers: "an account that wasn't the company's", "paying before delivery". Pay on delivery used as a trust fix. Felt safety 3.8/5 |
| Haggling with no limits | 4/6 sellers have a lowest price on every item, 2/6 on some; real tactics: anchoring, asking the budget, loyalty discounts |
| Slow replies and quiet buyers lose sales | 4/6 "buyer stopped replying"; "before my rep could get back… they messaged another vendor" |
| Existing bots answer but don't close | 2 of 3 who tried Meta's agent stopped ("customers complained about the automated responses"); 1 still uses it |
| Cross-border payment is improvised | Grey, Raenest, LemFi, a sister's personal USD account, USD/crypto. One seller (100+ orders/month) says most buyers are abroad (to confirm) |

**What the data does *not* show yet:** sellers feeling *payment* pain (they're paid upfront by transfer) and the size of cross-border demand. Batch 2 (diaspora buyers, sellers with foreign buyers) is pending; R6 follow-up call is the priority.

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
| M13 | Submission: public repo, MIT LICENSE, README, video < 3 min, Devpost text | 🟡 LICENSE done |
| M14 | **Seller desk** shell: Inbox · Catalog · Channels · Settings | 🟡 building 2026-11-11 |
| M15 | **Channel launch**: connect WhatsApp / Messenger / Instagram (IDs + token, encrypted at rest), one signed Meta webhook, replies sent back on the same channel | 🟡 building 2026-11-11 |
| M16 | **Languages**: buyer picks a language in the chat; agent replies in it; seller taps Translate on any message (cached) | 🟡 building 2026-11-11 |
| M17 | **Aró design system**: monotone indigo, Gloock / Schibsted Grotesk / Martian Mono, adire patterns, stamps, receipt cards | 🟡 building 2026-11-11 |
| M18 | Seller catalog editor (was S4): products, list + minimum price, tiers, delivery zones | 🟡 building 2026-11-11 |

### Should (only after Must is green)

| # | Feature |
|---|---|
| S1 | Channels **live** on a real Meta app (needs the seller's Meta developer app; Messenger/IG stay in development mode until App Review) |
| S2 | PayPal webhook (`PAYMENT.CAPTURE.COMPLETED`) as a backup to the return URL, signature-verified |
| S3 | Adversarial haggling suite (prompt injection, "your boss said 50% off", fake screenshots as text) run against the live agent, results in README |
| S5 | **Follow-up nudge** (now 4/6 lose sales to quiet buyers): one reminder with the pay link. First item after Must. |
| S7 | Pay-on-delivery answer: PayPal authorize at checkout, capture when the seller ships (29-day window). Post-freeze only. |
| S6 | Sponsor prize: **AG Grid** orders ledger in the seller inbox (stronger prize) *or* Render (we host there anyway). Decide by Nov 7. |

### Won't (this hackathon)

Meta App Review / public launch of Messenger and Instagram, Meta Embedded Signup (one-click connect), voice-note transcription, dispute evidence drafting, PayPal invoices and instalments, Paystack, live payments. **No claim of native-quality Yoruba/Hausa/Igbo/Pidgin**: shown as *beta* until a native speaker reviews.

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

## 10. Channels (how "launch your agent" works)

| Channel | Seller provides | Webhook object | Reply API | Limits today |
|---|---|---|---|---|
| Web chat | nothing (always on) | — | polling | — |
| WhatsApp | Phone number ID + access token | `whatsapp_business_account` | Cloud API `/{phone-number-id}/messages` | Test numbers reach 5 verified recipients; 24-hour reply window |
| Messenger | Facebook Page ID + Page access token | `page` | `/{page-id}/messages` | Development mode until App Review |
| Instagram | Instagram professional account ID + token | `instagram` | Instagram API `/{ig-id}/messages` | Development mode until App Review |

- One webhook for all three (`/api/channels/meta`), verified with the Meta app secret (HMAC-SHA256). Tokens encrypted with AES-256-GCM.
- Same agent, same tools, same money guard on every channel. Payment links always go to PayPal or the seller's own account.
- Outside Meta's 24-hour window, reminders go by PayPal email, not chat.
- Next: Meta Embedded Signup so sellers connect in one click; Telegram and TikTok when sellers ask.

## 11. Languages

| Tier | Languages | Why |
|---|---|---|
| Launch (Nigeria) | English, Naijá (Pidgin), Yorùbá, Hausa, Igbo | Nigeria's three biggest languages plus Pidgin, the real lingua franca of chat commerce. Igbo added: leaving out the third major language would be noticed. |
| Diaspora and buyers abroad | French, German, Chinese | Francophone West Africa next door; Germany and China are big sources of goods and diaspora buyers |
| Next | Arabic, Swahili, Portuguese, Twi | North/East Africa, Angola/Brazil, Ghana |

Rules: the model writes all money amounts exactly as tools return them (digits + currency), so the money guard works in every language. Product names stay as in the catalog. Translations for the seller are cached per message. Beta languages are labelled.

**Later: voice notes.** Many buyers send voice notes on WhatsApp. Transcribe → translate → same agent. Not in the hackathon build.

## 12. Design system: "Aró" (indigo dye)

- **Monotone:** one indigo hue at eleven depths (`--aro-50` paper to `--aro-950` ink), like cloth dipped in the dye pot again and again. No second accent colour: state is shown with fill, outline, stamps and patterns.
- **Type:** Gloock (display serif, like hand-cut market signage), Schibsted Grotesk (UI and chat), Martian Mono (prices, order refs, labels).
- **Motifs:** adire resist-dye patterns in pure CSS (eleko dots, alabere stitch lines, olokun ripples, aso-oke grid), notched fabric-tag cards, torn-receipt order cards, rubber stamps for status (PAID, SHIPPED), hard offset shadows on primary buttons.
- **No third-party logos:** Oja draws its own channel glyphs (hackathon trademark rule).
- Code: `src/app/globals.css` (tokens, patterns), `src/components/ui.tsx` (kit).

## 13. Scaling plan (after the hackathon)

1. **Hosting:** stateless Next.js app (Render/any Node host) + Neon Postgres; webhook processing moves to a queue when volume grows.
2. **Per-seller channel connections** are already multi-tenant (one webhook, routed by channel account ID).
3. **Model cost:** daily turn cap now; per-seller plans later (free tier for small sellers; paid for sellers with staff, like R3/R6 who already spend ₦500k–₦700k+/month on tools).
4. **Distribution:** every paid order carries an Oja link; referrals are how these sellers already win customers.

## 14. Open items

- [x] Read R6 (2026-11-04); findings addendum added. **Set the Sheet back to Restricted.**
- [ ] Follow-up calls: R6 first (cross-border volume), then R1, R5.
- [ ] Can a sandbox **business** account be created with country Nigeria?
- [ ] PayPal's official currency list: confirm NGN is unsupported.
- [ ] Meta's own "AI Providers" terms text.
