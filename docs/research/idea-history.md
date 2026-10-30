# Ideas considered and why they were dropped (2026-10-26)

Kept so we don't re-argue settled decisions. The current decision is in [oja-decision.md](oja-decision.md).

## Tests every idea had to pass

1. Novel: not crowded in the hackathon, and not a famous existing business.
2. AI-essential: couldn't exist before large language models.
3. PayPal-essential: uses something only PayPal has; "why not Stripe?" has an answer.
4. Agentic / fits PayPal's strategy.
5. "Why now".
6. A demo moment judges haven't seen.
7. Buildable solo in 16 days on the sandbox.

Plus Nigeria-fit tests: rides an existing habit, survives "I'll just call the vendor", gives a reason to keep using it, is easy to access, and uses PayPal where PayPal actually works.

## Dropped

| Idea | Why it was dropped |
|---|---|
| **HoldFast**: authorize, AI verifies delivery, capture or void | 9+ near-identical hackathon entries (Escrow Agent, Milestone, TrustLock, two ProofPays, Proof of Done, Pay on Delivery, CommishGuard…). The 3-day honor period breaks long shipping. PayPal Buyer Protection already covers it. Delivery photos are easy to fake. |
| **TippingPoint**: all-or-nothing group buy | It's Groupon (*The Point*, 2007, deals "tipped"). Mercata/MobShop (1999–2001) failed with this model. The AI isn't essential, it works the same on Stripe, and buyers won't wait. |
| **Quorum**: agents pool fuzzy buying intents into groups | Passes globally (6/7), but **fails in Nigeria**: no domestic PayPal use, impatience, new behaviour, trust ("pay later if the group completes" sounds like a scam). Could still be a US pitch. Its group-pricing mechanic survives inside Oja as aso-ebi mode. |
| Sandstorm: AI stress-tester for PayPal integrations | Uncontested, but impact is developer-only, design is weak, and Kernel vs PayPal login bot detection is a risk. Backup only. |
| Need-Pay / BuildBack: diaspora pays for a specific need or project | Authentic, but few Nigerian merchants issue PayPal invoices yet. The mechanic is close to the crowded escrow entries. |
| Ajo: rotating savings circle | Pooling money is regulated; Payouts needs approval; the AI's role is thin. |
| Aso-ebi coordination as the *whole* product | **Not unique**: Event Parcel, Eventus, Asoebi Assist, Asoebi Logistics ($7/guest) already exist. They prove the demand, but it's only a feature inside Oja. |

## Crowded areas in this hackathon (public GitHub, 2026-10-26)

Escrow/pay-on-proof (9+), disputes copilots (Exhibit, DisputeDesk, Rebuttal, Dispute Autopilot, Dispute Radar, SubGuard), agent spending limits (Permit, agent-spend-gate, PayAgent AI), invoice assistants, WebMCP/agent-ready stores (ShopBridge, AgentShelf, AgentBaazar), negotiation (AgentPal), debt netting (OFFSET). Re-check on days 5 and 10.

## Lessons from my own reasoning errors

- Check uniqueness against **history and existing products**, not only hackathon repos.
- "The AI parses text" is not essential AI.
- Always answer "why PayPal and not Stripe?"
- Red-team our own ideas as hard as other people's.
- Verify before claiming: two "facts" were wrong or incomplete until checked (aso-ebi uniqueness; Meta already shipping a business agent).
