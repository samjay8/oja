# PayPal reference for Oja

Official READMEs saved verbatim in [vendor/](vendor/). Treat third-party summaries as unverified.

## Key links

- Developer dashboard / sandbox apps: https://developer.paypal.com/dashboard/
- REST API reference: https://developer.paypal.com/api/rest/
- AI docs (docs.paypal.ai redirects to developer.paypal.com/docsai/): https://docs.paypal.ai/
- MCP server doc: https://developer.paypal.com/ai-tools/mcp-server.md
- Agent Toolkit (npm `@paypal/agent-toolkit`): https://github.com/paypal/agent-toolkit · [README copy](vendor/paypal-agent-toolkit-README.md)
- AI-Toolkit coding plugin (Claude Code: `/plugin install paypal@claude-plugins-official`): https://github.com/paypal/AI-Toolkit · [README copy](vendor/paypal-AI-Toolkit-README.md)
- Invoicing integration guide: https://developer.paypal.com/platforms/invoicing/integrate.md
- Partial payment definition: https://developer.paypal.com/api/invoicing/v2/definitions/partial_payment
- Payment holds help: https://www.paypal.com/smarthelp/article/faq3289
- Seller Protection: https://www.paypal.com/legalhub/seller-protection
- Acceptable Use Policy: https://www.paypal.com/uk/legalhub/acceptableuse-full
- Sandbox accounts: https://developer.paypal.com/api/rest/sandbox/accounts
- Developer Discord: http://developer.paypal.com/discord

## Auth

- OAuth client credentials: `POST https://api-m.sandbox.paypal.com/v1/oauth2/token` (production: `https://api-m.paypal.com`).
- Sandbox tokens are valid 3–8h (per the toolkit README): **refresh on the server automatically**.
- Toolkit config: `new PayPalAgentToolkit({ clientId, clientSecret, configuration: { actions: {...}, context: { sandbox: true } } })`. Enable only the actions we use.

## Agent Toolkit tools Oja expects to use

| Need | Tool(s) |
|---|---|
| Catalog from vendor photos | `create_product`, `list_products`, `show_product_details` |
| Quote → bill | `create_invoice` (supports shipping cost, PAY_BY_BANK option), `generate_invoice_number`, `send_invoice`, `generate_invoice_qr_code` |
| Instalments | `create_invoice` with `configuration.partial_payment` (`allow_partial_payment`, `minimum_amount_due`), **not IN/BR/IL** |
| Chasing payment outside Meta's window | `send_invoice_reminder`, `create_conditional_rules_for_invoice` (early-payment discount / auto-cancel) |
| Local naira transfer confirmed by vendor | `record_payment_for_invoice` (⚠️ NGN invoice currency likely unsupported; design the local ledger separately) |
| Price drops in group orders | `update_invoicing` (full replacement), `record_refund_for_invoice` / `create_refund` |
| Direct checkout instead of invoice | `create_order`, `get_order`, `pay_order` |
| Shipping and Seller Protection | `create_shipment_tracking`, `get_shipment_tracking`, `update_shipment_tracking` |
| After the sale | `list_disputes`, `get_dispute` (`accept_dispute_claim` **human only**) |
| Vendor ledger / insights | `list_transactions`, `get_merchant_insights` |

Not in the toolkit: authorize/capture-specific calls, webhook verification → call the REST APIs directly.

## Policy facts that shape the design

- **Holds:** approved carrier + tracking → release about 24h after the courier confirms delivery; services/digital goods 7 days after marked Completed; rarely up to 21 days.
- **Seller Protection (physical):** verifiable tracking, ship date, recipient address matching the transaction; proof of delivery = "delivered" + date. Carrier choice matters internationally.
- **Authorizations:** valid 29 days, 3-day honor period, partial/multiple captures; captures can exceed the authorized amount (up to 115% / +$75), so cap in code if used.
- **NGN** is likely unsupported (secondary sources only).

## Testing helpers

- Sandbox test accounts (buyer and business; the country is chosen at creation).
- `PayPal-Mock-Response` header: sandbox negative testing (simulate declines). Seen used in hackathon repos; confirm syntax in PayPal docs before relying on it.
- `PayPal-Request-Id` header: idempotency on POSTs.
- AI-Toolkit commands: `/paypal:sandbox`, `/paypal:test-accounts`, `/paypal:explain-error`, `/paypal:doctor`.
