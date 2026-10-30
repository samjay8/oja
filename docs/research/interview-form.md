# Interview form (Google Form): reviewed version

Source draft: the user's form text (2026-10-26). Built by [../../tools/interview-form/create-interview-form.gs](../../tools/interview-form/create-interview-form.gs).
**If you change questions, change them in both this file and the script.** Interview goals and decision rule: [interview-guide.md](interview-guide.md).

## Review of the draft: what changed and why

| Issue in the draft | Fix |
|---|---|
| Everyone saw both sections; no way to say "I only buy" | First question asks Seller / Buyer / Both and **routes** to the right section. The end of the seller section asks "Do you also buy?" so "Both" people get the buyer section too. |
| 13 open paragraph questions; heavy typing on a phone means people drop out | Kept the best story questions; added quick multiple-choice questions alongside them. Most stories are optional. Target is about 6–8 minutes. |
| Q13 "Would you be willing to pay a fee…?" was hypothetical, contradicting "no hypotheticals", and invites polite yeses | Replaced with past behaviour: "Have you ever chosen a payment method *because* it could get your money back?" |
| Q2 asked for exact percentages (people guess wildly) | Ranges: None / under 10% / 10–25% / 25–50% / over 50% / Not sure |
| No context about the respondent (country, what they sell, channels, volume) | Added a short "About you" page and seller basics. We can't segment the answers without them. |
| No question on **which channels** bring sales (from the interview guide) | Added "where customers reach you" + "which one brings the most sales" |
| No question on **payment methods** or **PayPal/Paga status**, which is core to the idea | Added both, as multiple choice |
| "Last price" had no question on whether a minimum price exists | Added "Do you have a lowest price you won't go below?" (validates the code-enforced minimum price) |
| Q9 assumed people know Meta's AI agent | First a "have you heard of / used it" question, then an optional follow-up |
| Buyer side didn't ask where the seller was, what builds trust, or what slow replies cause | Added "seller in another country?", "what makes you trust a seller (pick 3)", "when a seller is slow to reply, what do you do?", "how do you prefer to buy?" |
| No consent, privacy or follow-up | A final page: permission to quote (anonymous / named / no), follow-up chat opt-in, optional contact. A privacy note in the description, needed because we collect personal data and may quote people in the hackathon submission. |
| Description didn't say how long it takes or what happens to answers | Added the time estimate and a plain privacy line |

Kept from the draft: the title, the friendly section headings ("The One That Got Away", "Last price", etc.) and the story-first tone.

## Settings (set by the script)

- Progress bar on.
- **No sign-in required** and emails not collected, because forcing a Google sign-in loses respondents.
- Responses go to a new Google Sheet ("Oja interview responses").
- Most quick-tap questions required; story questions optional except one per role.

## Final form content

**Title:** 🚀 Help Us Build the Future of Social Commerce

**Description:**
> We're building a tool for people who buy and sell through WhatsApp, Instagram, Facebook and other online chats, and we want to get it right. Please tell us about things that actually happened to you, not what you think might happen. There are no right or wrong answers.
>
> ⏱ About 6–8 minutes. Most questions are quick taps; story answers can be one sentence.
>
> Privacy: we only use your answers to understand how people buy and sell online and to shape what we build. We don't sell your data. Contact details are optional. We may share anonymous summaries in a hackathon project submission, and we'll only quote you if you say yes at the end. To have your answers deleted, email {CONTACT_EMAIL}.

### Page 1: About you
1. **Which describes you?** *(required, routes)*: I sell online or through chats → Sellers · I buy from sellers online or through chats → Buyers · Both → Sellers
2. **Which country do you live in?** *(short, required)*
3. **Which city or state?** *(short, optional)*

### Page 2: For sellers
*Fashion, aso-ebi, tailoring, crafts, or anything else you sell. Tell us about the hustle behind the scenes.*

1. **What do you sell?** *(checkboxes, required, + Other)*: Clothing & fashion · Aso-ebi & fabrics · Tailoring / made-to-measure · Shoes, bags & leather · Beauty, hair & cosmetics · Crafts, art & beads · Food & groceries · Electronics & gadgets
2. **Where do customers reach you?** *(checkboxes, required, + Other)*: WhatsApp · Instagram · Facebook · TikTok · My own website · Online marketplace (e.g. Jiji, Jumia, Etsy) · Physical shop or market · Phone calls · Referrals / word of mouth
3. **Which ONE brings you the most sales?** *(one choice, required, + Other)*: same list
4. **About how many orders do you get in a typical month?** *(required)*: 1–10 · 11–30 · 31–100 · More than 100
5. **The "Just Sold It" Story.** Think of your last 3 sales. Where did each customer find you, and how did they pay? *(paragraph, optional; e.g. "Instagram DM, paid by bank transfer")*
6. **Beyond City Borders.** Last month, roughly how many of your buyers were outside your city? *(required)*: None · A few (under 10%) · Some (10–25%) · Many (25–50%) · Most (over 50%) · Not sure
7. **…and outside your country?** *(required)*: same options
8. **Which payment methods do you accept?** *(checkboxes, required, + Other)*: Bank transfer · Mobile money / wallet (OPay, Moniepoint, PalmPay, etc.) · POS / card in person · Payment link (Paystack, Flutterwave, Selar, etc.) · Pay on delivery / cash · PayPal · Money-transfer apps (Wise, LemFi, etc.) · Payoneer or Grey · Crypto / USDT
9. **Do you have a PayPal account?** *(required)*: No · I had one but stopped using it · Yes, and I receive payments with it · Yes, but I don't use it to receive payments · Not sure
10. **If you live in Nigeria: have you linked PayPal to Paga to receive money?** *(optional)*: Yes · No · I didn't know that was possible · I don't live in Nigeria
11. **The One That Got Away.** Tell us about the last time a potential sale slipped away. What exactly happened? *(paragraph, required)*
12. **What most often makes you lose sales? Pick up to 3.** *(checkboxes, max 3, required, + Other)*: I replied too late · We couldn't agree on price · The buyer didn't like my payment method · The buyer didn't trust me enough to pay · Delivery cost or time · Out of stock · Size or measurement issues · The buyer just stopped replying
13. **Going Global.** If you've sold to someone abroad, how did they pay you? Mention any fees, delays or headaches. *(paragraph, optional; "skip if you've never sold abroad")*
14. **The Money Drama.** Has a payment ever been reversed, disputed, or held? *(required)*: Never · Once · More than once
15. **If yes, what happened?** *(paragraph, optional)*
16. **After Hours.** At night or on weekends, how long do customers usually wait for your reply? *(required)*: Under 15 minutes · 15–60 minutes · 1–6 hours · Until the next morning · More than a day
17. **"Please, what is your last price?"** When a customer asks for your last price, how do you decide what to say? *(paragraph, optional)*
18. **Do you have a lowest price you won't go below for each item?** *(required)*: Yes, for every item · For some items · No, I decide in the moment
19. **The Tech Stack.** Which tools or subscriptions do you pay for each month? *(checkboxes, optional, + Other)*: Bumpa · Meta Verified · WhatsApp Business (free) · Online store builder (Shopify, Selar, etc.) · Design tools (e.g. Canva) · Scheduling or booking app · Social media ads · None
20. **Roughly how much do you spend on these each month, in total?** *(short, optional; any currency, e.g. ₦15,000 or $20)*
21. **AI Assistants.** Have you used Meta's AI business agent on WhatsApp, Instagram or Messenger? *(required)*: I haven't heard of it · I've heard of it but haven't tried it · I tried it and still use it · I tried it and stopped
22. **If you tried it: what did it do well, and what did it fail to do?** *(paragraph, optional)*
23. **Do you also buy from sellers through social media or chats?** *(required, routes)*: Yes, show me the buyer questions → Buyers · No, take me to the last page → Last step

### Page 3: For buyers
*Whether you live in Nigeria or abroad, tell us about shopping through the DMs.*

1. **How often do you buy from sellers you find on social media or chat apps?** *(required)*: Every week · A few times a month · A few times a year · Rarely · Never
2. **What do you usually buy?** *(checkboxes, optional, + Other)*: seller category list
3. **The DM Checkout.** Think about the last time you bought from a seller you found on social media. What did you buy, how did you pay, and how did it feel? *(paragraph, required)*
4. **How did you pay that time?** *(required, + Other)*: Bank transfer · Mobile money / wallet · Card · PayPal · Payment link (Paystack, Flutterwave, etc.) · Pay on delivery / cash · Money-transfer app (Wise, LemFi, etc.) · Crypto / USDT
5. **How safe did you feel paying?** *(scale 1–5, required)*: 1 = Very unsafe, 5 = Completely safe
6. **Was that seller in a different country from you?** *(required)*: Yes · No · Not sure
7. **The Dealbreaker.** Have you ever backed out of buying because of how the seller wanted to be paid? *(required)*: Yes · No
8. **If yes, what was the dealbreaker?** *(paragraph, optional)*
9. **Close Calls & Scams.** Have you ever been scammed, or nearly scammed, buying through a chat app? *(required)*: No · Nearly (a close call) · Yes · Prefer not to say
10. **If you're comfortable sharing, what happened?** *(paragraph, optional)*
11. **What makes you trust a seller enough to pay? Pick up to 3.** *(checkboxes, max 3, required, + Other)*: Reviews or testimonials · Someone I know recommended them · Verified badge · Many followers or a long history · Videos or live photos of the actual item · A video call · Pay on delivery · A payment method that can refund me (e.g. card or PayPal)
12. **Peace of Mind.** Have you ever chosen a payment method *because* it could get your money back if something went wrong (for example card or PayPal instead of a bank transfer)? *(required)*: Yes · No · Not sure
13. **If yes, tell us about it. Did it cost you extra?** *(paragraph, optional)*
14. **When a seller is slow to reply, what do you usually do?** *(required, + Other)*: Wait for them · Message another seller · Call them · Give up on buying
15. **How do you prefer to buy from a small seller?** *(required, + Other)*: Chat (WhatsApp or DM) · Phone call · Their website · In person

### Page 4: Last step
1. **Can we quote your answers in our project materials?** *(required)*: Yes, anonymously · Yes, with my first name and business name · No, please don't quote me
2. **Would you be open to a 15-minute follow-up chat?** *(required)*: Yes · No
3. **If yes, your WhatsApp number or email** *(short, optional; "only used to arrange the chat")*
4. **Anything else you'd like to tell us?** *(paragraph, optional)*

**Confirmation message:** Thank you! Your story helps us build something that actually works for buyers and sellers. 🙏

## Sending it out

- Target at least **6–8 sellers** (mix of Nigeria and abroad) and **6–8 buyers** (Nigeria-based and diaspora). More is better, but these numbers are enough to apply the decision rule.
- Message people personally (WhatsApp, Instagram DMs to vendors you know). A personal ask gets far more replies than a broadcast.
- Read responses daily in the linked Sheet. Invite the most interesting "yes to follow-up" people for a call.
