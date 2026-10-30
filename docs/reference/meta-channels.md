# Meta channels reference (WhatsApp, Instagram, Messenger)

Checked 2026-10-26. Meta changes these often, so re-check before building each adapter.

## WhatsApp Cloud API

- Get started: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/
- Platform overview: https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform
- Adding WhatsApp to a Meta app creates a **test WhatsApp Business Account**. The test number can message **up to 5 verified recipient numbers**, free, and can't message real customers. ✅
- Free-form replies within 24h of the customer's last message; outside that, approved templates (paid). Pricing details changed in 2025–2026 and sources conflict ❓, so check Meta's pricing page.
- **"AI Providers" terms (effective 2026-01-15):** general-purpose AI assistants are barred; business-scoped bots (support, orders, catalog recommendations for one business) are described as allowed. ⚠️ Based on secondary sources; read Meta's own WhatsApp Business Solution Terms.
  - https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform
  - https://www.alibabacloud.com/help/en/chatapp/use-cases/whatsapp-ai-policy-2026-guide
  - https://whatsapp.galantis.com/blog/whatsapp-ai-chatbot-ban-2026

## Instagram Messaging API

- Overview: https://developers.facebook.com/docs/instagram-messaging/overview
- Instagram Login messaging: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api
- Requires an Instagram **professional** account. ✅
- 24h reply window; the `human_agent` tag allows replies later (7 days per third parties ⚠️). ✅/⚠️
- **A path to a human agent is mandatory.** ✅
- **Advanced Access (App Review)** needed to serve professional accounts you don't own or manage. ✅ Permissions typically requested: `instagram_business_basic`, `instagram_business_manage_messages`, `human_agent` (per Chatwoot's guide ⚠️: https://developers.chatwoot.com/self-hosted/instagram-app-review).
- One customer per conversation: **no group messaging**. Inactive Requests-folder threads (30 days) aren't returned. ✅

## Messenger Platform

- Overview: https://developers.facebook.com/docs/messenger-platform/overview
- **Standard Access** only reaches people with a role on the app or Page; **Advanced Access** for `pages_messaging` needs App Review. Business verification is listed as a prerequisite in the Login Connect guide. ✅
- Respond within 24h of the person's message. ✅ Message-tag rules: ❓ check the docs.

## Hackathon plan

- Build the agent core channel-agnostic. **Web chat is the primary channel.**
- WhatsApp adapter on the test number for the video.
- IG/Messenger adapters in **development mode** on our own test Page and account (stretch goal); the submission states that App Review is needed for public use.
- Payment reminders outside the 24h window → PayPal invoice reminder emails, not Meta messages.
- Video: avoid Meta logos and close-ups unless brand rules permit (the hackathon rules forbid third-party trademarks without permission).
