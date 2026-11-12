# Oja

**The AI sales agent that closes the chat and gets the seller paid, through PayPal.**

Small sellers sell in chat. Buyers ask, haggle, worry about delivery, and go quiet. Oja replies in seconds from the seller's real catalog, in the buyer's language. It haggles inside a price floor that code enforces, quotes delivery cost and arrival time upfront, and sends a PayPal checkout to the seller's own verified account. After the sale it adds shipment tracking to PayPal.

It starts as a web chat on the seller's Oja shop page. From the seller desk, the seller launches the same agent on **WhatsApp, Messenger or Instagram**, wherever their buyers are.

*Ọjà* is Yorùbá for "market".

> Built for the PayPal AI Hackathon 2026. **PayPal sandbox only**: no real money moves. The demo shops, products and reviews are sample data.

## Try it

**Live demo: https://oja-4586.onrender.com** (first load after idle can take up to a minute on the free plan)

| | |
|---|---|
| Buyer chat (demo shop, autopilot) | https://oja-4586.onrender.com/shop/ife-textiles |
| Seller desk | https://oja-4586.onrender.com/vendor/ife-textiles · dashboard key `oja-demo-2026` |
| Naira shop (bank-transfer rail, copilot) | `/shop/tolu-cakes` and `/vendor/tolu-cakes` (same key) |
| PayPal sandbox **buyer** (log in at checkout) | `sb-wid9v53749299@personal.example.com` · password `p_BIi1+H` |

Things to try as a buyer:
1. Pick a language in the chat header: English, Naijá, Yorùbá, Hausa, Igbo, Français, Deutsch or 中文.
2. "How much is delivery to London?"
3. "Last price for the adire two-piece?" Keep pushing; it won't go below the seller's floor.
4. "I need aso-ebi fabric for 30 people." Group prices apply automatically.
5. Give a name and address, pay with the sandbox buyer account, and the chat confirms the payment.
6. In the seller desk: approve or edit drafts, translate a buyer's message, add a tracking number (it's added to the PayPal transaction), edit the catalog, and launch the agent on a channel.

## Why sellers need it

From 6 seller and buyer interviews in Nigeria (Oct–Nov 2026; details in `docs/research/`):

- 5/6 sellers lose sales to **delivery cost or time**.
- 4/6 lose sales when **the buyer stops replying**.
- 4/6 buyers have been **scammed or nearly scammed** paying in chat ("the seller wanted me to pay to an account that wasn't the company's account").
- 2 of 3 who tried Meta's AI agent stopped using it ("customers complained about the automated responses").

## How it works

```
Buyer (web · WhatsApp · Messenger · Instagram)
        │
        ▼
   Agent (Claude) ──tools──▶ Oja commerce code ──▶ PayPal Agent Toolkit
        │                    prices, floors,        create_order · pay_order
        │                    delivery, totals       create_shipment_tracking
        ▼
   Money guard ──▶ sent, or held as a draft for the seller
```

- **The AI never sets an amount.** Claude only gets Oja's own tools (`negotiate`, `quote_delivery`, `create_checkout`, and so on). Prices come from `src/lib/pricing.ts`, delivery from the seller's zone table, totals from the database. Oja's code calls the PayPal toolkit with those numbers; the model never does.
- **Money guard.** Every reply is scanned for amounts and links (`src/lib/guard.ts`). Anything the code didn't produce is held for the seller instead of being sent, in every language.
- **Copilot by default.** The agent drafts and the seller taps send. Autopilot is a switch, and flagged replies still go to the seller.
- **Payment checks.** On return from PayPal, Oja captures the payment and checks the captured amount and currency against the order before marking it paid. The capture is idempotent.
- **Seller Protection by design.** Oja ships to the address on the PayPal transaction, uses tracked carriers, and adds tracking with `create_shipment_tracking`.
- **Payment router.** USD sales go through PayPal. Naira sales inside Nigeria go to the seller's own business account, and only the seller can mark them paid.
- **Channels.** One signed Meta webhook (`/api/channels/meta`) receives WhatsApp, Messenger and Instagram messages and routes them to the right seller. Channel tokens are encrypted at rest (AES-256-GCM).
- **Languages.** The buyer picks a language; the agent replies in it; the seller can translate any message into their own language (cached). Naijá, Yorùbá, Hausa and Igbo are marked beta until reviewed by native speakers.
- **Cost controls.** Per-session and per-IP rate limits, plus a daily cap on agent turns.

### PayPal usage

Through the official [`@paypal/agent-toolkit`](https://github.com/paypal/agent-toolkit), with least-privilege actions, sandbox only. Oja's code calls the toolkit; the model never does.

| Toolkit action | What Oja uses it for |
|---|---|
| `create_order` | Creates the PayPal order for the exact total Oja's code computed, and returns the buyer's checkout link |
| `get_order` | Checks the order amount and currency with PayPal before capturing |
| `pay_order` | Captures the payment when the buyer returns; the captured amount is checked again |
| `create_shipment_tracking` | Adds the seller's carrier and tracking number to the PayPal transaction (Seller Protection) |

### AI usage

Claude Opus 5.5 (`claude-opus-5-5`) through the Anthropic SDK's tool runner, with prompt caching. It only gets Oja's own tools: `search_catalog`, `product_details`, `show_reviews`, `negotiate`, `quote_delivery`, `create_checkout`, `order_status`, `handoff_to_human`. It also translates messages for the seller. A money guard checks every reply for amounts or links the code didn't produce.

### Hosting: Render

The app runs on Render as a Node web service (`render.yaml`, Frankfurt), with Postgres on Neon. Migrations and the demo seed run at boot. Live: https://oja-4586.onrender.com

## Design: Aró

A monotone indigo design system named after *aró*, the dye of adire cloth. One hue at eleven depths, Gloock / Schibsted Grotesk / Martian Mono, adire resist-dye patterns drawn in CSS, notched fabric-tag cards, torn-receipt orders and rubber-stamp statuses. Tokens live in `src/app/globals.css`, components in `src/components/ui.tsx`. Oja draws its own channel glyphs rather than using third-party logos.

## Run locally

```sh
pnpm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY and PayPal sandbox credentials
pnpm dev                     # http://localhost:3000
pnpm test                    # pricing, guard, channels, crypto, full checkout flow on in-memory Postgres
pnpm try-agent               # chat with the real agent in the terminal
```

With no `DATABASE_URL`, Oja uses embedded Postgres (PGlite) in `.data/` and seeds the demo shops on first boot.

### Connecting a channel (seller desk → Channels)

1. Create an app at Meta for Developers and add WhatsApp, Messenger or Instagram.
2. Set the webhook URL shown on the Channels page and the verify token (`META_WEBHOOK_VERIFY_TOKEN`), and subscribe to `messages`.
3. Paste the phone number ID, Page ID or Instagram account ID and its access token into the Channels page.

Messenger and Instagram run in Meta development mode until App Review. WhatsApp test numbers reach up to 5 verified recipients.

## Stack

Next.js 16 · React 19 · TypeScript · Claude (`claude-opus-5-5`, Anthropic SDK tool runner) · PayPal Agent Toolkit · Meta Graph API (WhatsApp Cloud API, Messenger Platform, Instagram API) · Drizzle ORM · Postgres (Neon) / PGlite · Tailwind 4 · Render.

## Licence

MIT
