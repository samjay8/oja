# Oja — decision record (as of 2026-10-26)

Status: **idea chosen, pending user interviews** ([interview-guide.md](interview-guide.md)). No code yet.
Working name: **Oja** (Ọjà, Yoruba for "market").

## One line

**Meta's agent can talk. Oja closes the sale, collects the money through PayPal, and protects it after the sale, on any channel, for any buyer, anywhere.**

## Problem (keep factual; replace with interview quotes once we have them)

Social and chat commerce runs on conversation (WhatsApp, Instagram DMs, Messenger, website chat), but conversation is a poor way to take payment:

1. Slow replies across time zones lose buyers.
2. "Send to my account" asks strangers to trust strangers.
3. Haggling ("last price?") has no limits.
4. Custom orders (measurements) and cross-border shipping lead to "not as described" / "not received" disputes the seller loses.
5. After the sale, sellers don't know Seller Protection rules, so funds get held and disputes get lost.

## Why now (verified, see [verified-facts.md](verified-facts.md))

- PayPal reopened **inbound** payments for Nigerians through Paga on **2026-01-27**.
- Meta Business Agent went global on **2026-06-03**: chat AI is now cheap, but the coverage we read doesn't show it taking payments, negotiating or doing cross-border.
- US duty-free entry under $800 has been suspended for all countries since 2025-08-29 (upheld 2026-08-13), so landed-cost surprises now cause disputes.

## Users

- **Sellers anywhere**, first market: Nigerian social sellers (fashion, aso-ebi, tailoring, crafts) who sell to buyers at home and abroad.
- **Buyers anywhere, Nigerians included.** Location doesn't matter; sales do.

## What it does

1. Answers 24/7 across channels from the vendor's **real catalog** (never invented prices, stock or dates).
2. **Haggles within a minimum price enforced in code.** The AI proposes; code decides every amount.
3. Turns the chat into payment through the **payment router** (below): PayPal invoice or checkout, instalments where available, PayPal reminder emails.
4. **Protects the sale by design:** order confirmation summary stored as evidence; ship to the address on the transaction; approved tracked carrier; `create_shipment_tracking`; dispute evidence drafted from the chat.
5. **Group orders** (aso-ebi mode): one link shared to a group; per-unit price tiers drop as the group grows.
6. One vendor inbox across channels, with instant human takeover and a morning summary.

## Channels

- **Web chat: core.** Embeddable widget + hosted shop link. Always available; it's how judges test.
- WhatsApp (Cloud API), Instagram DMs, Facebook Messenger: **adapters** on the same agent core. See [../reference/meta-channels.md](../reference/meta-channels.md).
- Reminders outside Meta's 24h window go through PayPal invoice emails (`send_invoice_reminder`), not Meta messages.

## Payment router

| Flow | Rail |
|---|---|
| Buyer abroad → Nigerian seller | PayPal (seller receives via Paga link) |
| Nigerian buyer → seller abroad | PayPal (card limits raised in 2026; bank-dependent) |
| Abroad → abroad | PayPal |
| Nigerian buyer → Nigerian seller in **naira** | **Not PayPal** (NGN appears unsupported, still to verify). Hackathon: bank transfer **confirmed by the vendor** (the AI never marks it paid). Later: Paystack/Flutterwave. Allowed under the rules' "Third Party Integrations". |
| Instalments | Only where PayPal supports partial invoice payment (**not India, Brazil, Israel**) |

## Why PayPal is essential

- Buyer Protection lets a stranger trust a seller in another country.
- Seller Protection + tracking from an approved carrier → held funds release about 24h after confirmed delivery (PayPal Help).
- Invoicing: instalments, reminders, QR codes, recording external payments.
- PayPal now reaches Nigerian sellers (Paga).

## Hackathon scope (16 days from 2026-10-27; freeze day 10)

**Must:**
- Web chat + vendor inbox
- Full flow on sandbox: quote → haggle (with minimum price) → confirm → PayPal invoice/checkout → paid (webhook) → tracking
- One aso-ebi group order
- Seeded "judge mode" vendor
- WhatsApp adapter (video)

**Stretch:** Instagram + Messenger adapters (development mode), voice notes, dispute evidence drafting, AG Grid ledger (sponsor prize).

**Out:** live payments, Paystack production, Yoruba/Igbo/Hausa claims.

## Prize targets

Grand Prize / Best Use of PayPal + AI / Most Impactful, plus **one** sponsor prize (AG Grid or Render). See [../rules-checklist.md](../rules-checklist.md).
