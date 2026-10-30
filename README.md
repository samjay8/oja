# Oja

**The AI sales agent that closes the chat and gets the seller paid, through PayPal.**

Small sellers sell in chat: web, WhatsApp, Instagram, Messenger. Buyers ask, haggle, worry about delivery, and go quiet. Oja replies in seconds from the seller's real catalog. It haggles inside a price floor that code enforces, quotes delivery cost and arrival time upfront, and sends a PayPal checkout to the seller's own verified account. After the sale, it adds shipment tracking to PayPal.

*Ọjà* is Yoruba for "market".

> Hackathon build for the PayPal AI Hackathon 2026. **PayPal sandbox only**: no real money moves. The demo shops, products and reviews are sample data.

## Try it

| | |
|---|---|
| Buyer chat (demo shop) | `/shop/ife-textiles` |
| Seller inbox | `/vendor/ife-textiles`, dashboard key `oja-demo-2026` |
| Naira shop (bank-transfer rail, copilot mode) | `/shop/tolu-cakes` and `/vendor/tolu-cakes` (same key) |
| PayPal sandbox buyer login | _to be added before submission_ |

Things to try as a buyer:
1. "How much is delivery to London?"
2. "Last price for the adire two-piece?" Keep pushing; it won't go below the seller's floor.
3. "I need aso-ebi fabric for 30 people." Group prices apply automatically.
4. Give a name and address, pay with the sandbox buyer account, and the chat confirms payment.
5. In the seller inbox: enter a tracking number. It's added to the PayPal transaction.

## How it works

```
Buyer (web / WhatsApp) ──▶ Agent (Claude) ──tools──▶ Oja commerce code ──▶ PayPal Agent Toolkit
                              │                         (prices, floors,       create_order · pay_order
                              ▼                          delivery, totals)     create_shipment_tracking
                        Money guard ──▶ sent, or held as a draft for the seller
```

- **The AI never sets an amount.** Claude only gets Oja's own tools (`negotiate`, `quote_delivery`, `create_checkout`…). Prices come from `src/lib/pricing.ts`, delivery from the seller's zone table, totals from the database. The PayPal toolkit is called from code with those numbers, never by the model.
- **Money guard.** Every reply is scanned for amounts and links (`src/lib/guard.ts`). Anything that didn't come from Oja's code is held for the seller instead of being sent.
- **Copilot by default.** Sellers told us customers dislike bot replies, so Oja drafts and the seller taps send. Autopilot is a switch, and the money guard still holds risky replies.
- **Payment checks.** On return from PayPal, Oja captures the payment and checks the captured amount and currency against the order before marking it paid. The capture is idempotent.
- **Seller Protection by design.** Oja ships to the address on the PayPal transaction, uses tracked carriers, and adds tracking to PayPal with `create_shipment_tracking`.
- **Payment router.** USD sales go through PayPal. Naira sales inside Nigeria use the seller's bank account, and only the seller can mark them paid; the AI never can.
- **Audit trail.** Every offer, order, capture and shipment is logged as an event.

### PayPal usage

Through the official [`@paypal/agent-toolkit`](https://github.com/paypal/agent-toolkit), with least-privilege actions, sandbox only:
`create_order`, `get_order`, `pay_order` (capture), `create_shipment_tracking`, `list_disputes`.

## Run locally

```sh
pnpm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY and PayPal sandbox credentials
pnpm dev                     # http://localhost:3000
pnpm test                    # pricing, guard, and full checkout flow on in-memory Postgres
```

With no `DATABASE_URL`, Oja uses embedded Postgres (PGlite) in `.data/` and seeds the demo shops on first boot.

## Stack

Next.js 16 · TypeScript · Claude (`claude-opus-5-5`, Anthropic SDK tool runner) · PayPal Agent Toolkit · Drizzle ORM · Postgres (Neon) / PGlite · Tailwind · Render.

## Licence

MIT
