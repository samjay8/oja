# Interview findings: batch 1 (5 responses, 2026-10-27 → 10-29)

Source: Google Form responses Sheet (raw data **not** stored in the repo; it contains contact details). Respondents are R1–R5 in timestamp order. No personal data here. All five agreed to be quoted (four anonymously, one with name and business name).

## Caveats (read first)

- **n = 5.** Directional only, not proof.
- **All five live in Nigeria** (Lagos ×3, Abuja, Ibadan). **No diaspora buyers or sellers abroad yet**, and that's the group Oja's PayPal story depends on most.
- Likely a convenience sample (the user's network): 4/5 picked "Both".
- **R5 mentioned "Oja" by name**, so they'd heard the pitch beforehand and may be biased positive.
- **The cross-border question was misread.** R2 says under 10% of buyers are outside their city but 25–50% are outside their country. That's impossible, since everyone outside the country is also outside the city. Treat the share numbers as unreliable and fix the question (see below).

## Who answered

| | Sells | Top channel | Orders/month | Foreign-payment method mentioned |
|---|---|---|---|---|
| R1 (Ibadan) | Beauty, food | WhatsApp | 1–10 | Grey, Raenest, LemFi |
| R2 (Lagos) | Fashion, shoes/bags, electronics | Physical shop | 11–30 | accepts Crypto/USDT |
| R3 (Abuja) | Fashion (has a customer-care rep, sales script, website) | Physical shop | 31–100 | **Sister's personal US-dollar account** for Ghanaian/foreign buyers |
| R4 (Lagos) | Cakes & confectionery | WhatsApp | 1–10 | none ("my business isn't that broad") |
| R5 (Lagos) | Crafts, art & beads | Referrals | 11–30 | bank transfer, "no headaches" |

## What the data says

### Strong signals

1. **Delivery is the #1 reason sellers lose sales: 5/5** ticked "Delivery cost or time". Two of the five "lost sale" stories are about delivery (R2 "payment issues and logistics", R5 "delivery was delayed"). **Oja doesn't address this yet.**
2. **Buyers carry the risk, and it hurts them.** **4/5 buyers were scammed (2) or nearly scammed (2):**
   - R1: "I paid for an item once and got blocked after."
   - R3: "paid for a class… added to a group and that was it. No class."
   - Dealbreakers: R1, "the seller wanted me to pay to an account that wasn't the company's account". R5, "paying before delivery".
   - Average "how safe did you feel paying" = **3.6/5**.
3. **Sellers do have minimum prices: 4/5 have a lowest price for every item, 1/5 for some items.** Their haggling tactics:
   - R4: "If I am selling a pastry for 500 naira I tell them 700."
   - R5: "I would ask what the customer's budget was."
   - R3: has a sales script for the rep.
   - R1: fixed prices, discounts for returning customers or during sales.

   **This validates the minimum-price-in-code design, and gives us real tactics to encode** (anchoring, asking for budget, loyalty discounts).
4. **Meta's agent disappointed everyone who tried it: 2/2 stopped.**
   - R1: "**Customers complained about the automated responses.**"
   - R3: "I wasn't feeling it so I stopped."
   - (R2 has heard of it but not tried it; R4 and R5 have never heard of it.)

   **This is both an opportunity and a warning.** Customers notice and dislike bot replies.
5. **Buyers trust social proof, not payment features.** Trust drivers: reviews 4/5, someone recommended them 4/5, videos or live photos 3/5, video call 1, long history 1, pay on delivery 1. **"A payment method that can refund me" got 0/5.** Yet 3/5 have chosen a method *because* it could refund them (R2 got money back through an OPay report).
6. **"Buyer stopped replying": 3/5 sellers.** R3's lost sale: "the watch they wanted was faulty, and before my rep could get back to them they had messaged another vendor." Speed and follow-up matter.

### Weak or unvalidated signals

7. **PayPal adoption is near zero.** Sellers: 3 have no account, 1 stopped using it, 1 has it but doesn't receive with it. **0/5 have linked Paga.** Buyers: 0/5 paid with PayPal. Every domestic purchase was a bank transfer or mobile wallet.
8. **Payment method as a loss reason: only 1/5** (R1, a buyer who wanted to pay in crypto). **Sellers don't feel payment pain, because they're paid upfront by transfer.** The risk sits with the buyer (see signal 2).
9. **Disputes, reversals, holds: 3/5 never; 2 once** (a bank network issue; "customer promised to pay at a particular date"). Seller Protection is **not** a felt pain in this sample.
10. **Cross-border is real but small and informal.** 4/5 sellers mention some foreign buyers. The workarounds are fragmented: Grey, Raenest, LemFi, a **sibling's personal USD account**, crypto. Shares are unreliable (see caveats).
11. Night and weekend reply times are mixed: under 15 min (1), 15–60 min (1), 1–6h (2), more than a day (1).

### Channels and habits

- **WhatsApp 5/5.** Instagram only 1/5. **Phone calls 4/5 sellers.** Physical shop or referrals are the top channel for 3/5.
- When a seller is slow, buyers wait (3) or **call** (2). Preferred way to buy: in person 2, chat 2, phone 1.
- Tool spend: three spend ₦0, R1 ~₦25k (Canva + ads), **R3 ~₦500k/month** (ads, website, CapCut). Only the larger seller pays for tools.

## What this means for Oja (proposed, pending user decision)

| Finding | Change to Oja |
|---|---|
| Delivery is the #1 loss (5/5) | Quote **delivery cost + ETA up front**; proactive delay updates to the buyer; `create_shipment_tracking`; logistics integrations later |
| Buyers get scammed; "account wasn't the company's" | **Verified-payee checkout**: payment always goes to the business's own verified account. PayPal checkout shows the verified merchant name, a direct answer to R1's dealbreaker. |
| Trust comes from reviews, referrals and videos | When a buyer hesitates, the agent shows the vendor's **real reviews and product videos** |
| Customers dislike automated replies (2/2) | **Copilot mode by default**: the AI drafts, the vendor or rep taps send. Autopilot only for structured steps (quote, payment link, tracking, reminders) or after hours with clear labelling. Never pretend to be human. |
| Minimum prices + real haggling tactics (4/5) | Keep the code-enforced minimum price; encode the **vendor's own playbook** (anchoring, ask for budget, loyalty discount). R3's "sales script" becomes a setup input. |
| "Stopped replying" (3/5) | Follow-up nudges with the payment link; PayPal invoice reminders |
| Sellers don't feel payment pain | **The pitch to sellers is conversion, not protection**: "turn hesitant buyers into paid orders." The protection pitch is for buyers. |
| PayPal near-zero, NGN not on PayPal | PayPal stays the rail for **cross-border** and protected checkout. Domestic naira uses a local rail. ⚠️ **Tension with the rule that PayPal be central**: the cross-border slice must be demonstrated, and the data hasn't proven it yet. |
| Phone calls matter (4/5) | Future: call-to-chat handoff / voice. Not hackathon scope. |
| Capacity (R4 "fully booked") | Future: order calendar (possible Bryntum prize). Single data point. |

## Fixes for the form (batch 2)

1. Replace the two share questions with: **"Last month, about how many of your buyers lived in another country? (None / 1–2 / 3–5 / 6–10 / More than 10)"**. Absolute counts, one question, no city/country confusion.
2. Add: **"When delivery causes a lost sale, what usually happens?"** (cost too high / too slow / unreliable rider or courier / can't deliver to their location / Other).
3. Add for sellers: **"Do you sell to people in Nigeria who live in another city and pay before delivery?"**, to separate domestic remote from cross-border.
4. Don't share the product name or pitch before people fill the form.

## Next data we need

- **Diaspora buyers** (UK/US/Canada) who buy from Nigerian sellers: at least 5.
- **Sellers with regular foreign buyers** (fashion/aso-ebi vendors on Instagram): at least 5.
- Follow-up calls with R1 and R5 (both opted in).

## Addendum: R6 (received 2026-10-31), totals now n = 6

**R6 (Ibadan): electronics and gadgets, more than 100 orders a month, top channel is their own website**, also WhatsApp, Instagram, Facebook, TikTok and referrals. Spends **₦700k+ a month** on ads and design tools. Agreed to be quoted anonymously and to a follow-up call.

What's new from R6:
- **The biggest cross-border seller so far:** says most buyers are outside the city *and* outside Nigeria (over 50% each). Foreign buyers pay "through USD or crypto". Has a PayPal account but doesn't use it to receive; hasn't linked Paga. ⚠️ Same share question as the one R2 misread, so confirm on the follow-up call: how many buyers abroad last month, and which countries.
- **First person still using Meta's AI agent** ("tried it and still use it"). Meta's agent is now 2/3 stopped, 1/3 still using. So "Meta's bot failed" no longer holds as a blanket claim. The gap to claim is narrower: payment, price floors and delivery, not "bots are bad".
- **Pay on delivery** is how R6 sells (Facebook buyer paid by transfer on delivery) and how R6 trusts as a buyer ("pay on delivery", "someone I know recommended them"). Felt safety 5/5, never scammed.
- Lost sale: "the customer wasn't serious". Top loss reason: **buyer stopped replying** (not delivery).
- Haggling: tells buyers the price is already discounted; a floor for some items only.

Updated totals (n = 6):

| Signal | Batch 1 (n=5) | Now (n=6) |
|---|---|---|
| Delivery cost/time loses sales | 5/5 | **5/6** |
| Buyer stopped replying | 3/5 | **4/6** |
| Buyers scammed or nearly | 4/5 | **4/6** |
| Avg felt safety paying | 3.6 | **3.8** |
| Floor price on every item / some items | 4 / 1 | **4 / 2** |
| Tried Meta's agent → stopped / still use | 2 / 0 | **2 / 1** |
| Sellers receiving with PayPal | 0/5 | **0/6** |
| Sellers with a meaningful share of buyers abroad | unclear | **1 clear (R6), to confirm** |

What it changes for Oja:
1. **Follow-up nudges move up** (now 4/6): a quiet buyer gets one reminder with the pay link. Moved from "should" toward "must" in the PRD.
2. **Pay-on-delivery is a trust habit we must answer.** PayPal's version: the buyer pays now with PayPal Buyer Protection, so they get the same safety without the seller carrying the risk. Candidate feature (post-freeze, not MVP): authorize at checkout, **capture when the seller ships**, within PayPal's 29-day authorization window.
3. **Positioning:** don't call Meta's agent a failure. Say "Meta's agent answers; Oja closes the sale: price floor, delivery quote, PayPal checkout, tracking."
4. **Call R6 first.** Highest volume, highest tool spend, most foreign buyers, already pays for automation: our ideal early customer.
