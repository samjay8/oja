# Rules → what they mean for Oja

Derived from [hackathon-rules.md](hackathon-rules.md) (verbatim). If this file and the rules disagree, the rules win.

## Hard deadlines

| Event | Pacific Time | Lagos (WAT, UTC+1) |
|---|---|---|
| Submission closes | **Thu Nov 12, 2026, 12:00 PM PT** | **Thu Nov 12, 9:00 PM WAT** (US DST ends Nov 1, so PT = UTC−8) |
| Our internal deadline | Wed Nov 11 | Submit a full draft by Nov 11; Devpost allows saving drafts |
| Judging | Dec 1, 2:00 PM PT – Dec 15, 8:00 AM PT | — |
| Winners | ~Mon Dec 21, 2:00 PM PT | — |

After the deadline the submission is frozen (§5). The **project must stay testable, free and unrestricted until judging ends** (Testing section): Dec 15, 8:00 AM PT.

## Must-haves (each is pass/fail)

- [ ] Uses the **PayPal developer platform via the sandbox** + an AI tool/model. **"PayPal integration is central to the project."** Stage One is a pass/fail check that it "reasonably applies the required APIs/SDKs", so PayPal has to be visibly central in the demo, README and description.
- [ ] Text description of features and functionality.
- [ ] **Working demo judges can run**: a hosted URL *or* complete setup instructions. Mockups don't qualify. → We provide **both**.
- [ ] **Public repo** (GitHub) with all source, assets and instructions.
- [ ] **Open-source LICENSE file, detectable in the repo's About section** (e.g. MIT at the repo root; check that GitHub shows it).
- [ ] README includes **test credentials / sandbox logins / keys judges need** (Testing section). → Ship sandbox buyer and seller test accounts and a seeded demo vendor. **Never put live secrets in the repo.** Use sandbox-only credentials scoped to a throwaway app.
- [ ] **Video under 3:00**, public on YouTube, showing the project working on the device it was built for.
- [ ] **No third-party trademarks or copyrighted music without permission.** ⚠️ This affects us: the WhatsApp/Instagram/Facebook logos and UIs are Meta trademarks. Plan: lead with **our own web chat**; keep the WhatsApp segment short, avoid logo close-ups, or check Meta's brand-resource rules first. Use no music or royalty-free music only. Show a real vendor only with written consent.
- [ ] Everything in English (translate any Pidgin/Yoruba shown on screen with subtitles).
- [ ] Original work, solely owned. Open-source dependencies are fine if licenses are respected.
- [ ] New project (new repo, started after Oct 1). No code copied from pre-hackathon repos.

## Allowed (confirmed by the rules)

- **Third-party APIs** (Meta WhatsApp/Messenger/Instagram, Paystack, LLM providers) **are allowed** if we're authorized under their terms. This answers open question #6: a local naira payment method is fine, as long as PayPal stays central.
- Any PayPal service counts: Venmo, Braintree, Xoom, Hyperwallet, Zettle, etc.
- Sponsor tools are optional.

## Judging: what to optimise

Five criteria, weighted equally. **Tie-break order is the list order: Technological Implementation → Design → Impact → Innovation → Presentation.**

| Criterion | What the rule text asks | Oja's answer |
|---|---|---|
| Technological Implementation | "thoroughly and skillfully" uses PayPal + AI; "non-trivial" | Invoices (instalments, reminders, QR), Orders, shipment tracking, disputes, webhooks, catalog, a payment router, minimum-price enforcement in code, multi-channel |
| Design | "complete, coherent product experience" | Real web chat + vendor inbox + morning summary, not a demo script |
| Potential Impact | "credible, specific case… real problem for a real audience… based on what's demonstrated" | **Real vendor interview quotes**; demo the exact pain points they describe |
| Innovation | "differ from existing concepts" | Name Meta Business Agent and Bumpa openly and show what Oja does that they don't (payment + protection + bounded haggling) |
| Presentation | end-to-end in video; problem / who / why | Problem → who → live sale → money protected → why PayPal |

Judging "may utilize… automated AI-driven analysis". So the README and description should be **clearly structured and literal**: features, PayPal APIs used, how to run.

## Prizes we can actually stack

Max: **one Grand Prize or one Honorable Mention, plus one Sponsor Prize.**

- Main targets: Grand Prize; Honorable Mentions **Best Use of PayPal + AI**, **Most Impactful**.
- Sponsor target (pick one to do properly):
  - **AG Grid** (largest, $5k/$2k/$1k×3): the vendor order and payment ledger grid. Fits naturally.
  - **Render** (credits): we'd host there anyway.
  - Decide by day 3. AG Grid is the stronger prize if the vendor dashboard is real.

## Ongoing-cost risks during judging (Nov 12 – Dec 15)

- The hosted demo must stay up: free tiers that sleep or expire are a risk.
- **LLM API spend from judges and the public**: needs rate limits and a hard budget cap.
- Sandbox access tokens expire (3–8h for sandbox, per the agent-toolkit README), so the server must refresh tokens itself from the client ID and secret.
- The WhatsApp test number only reaches 5 verified recipients, so judges use the web chat.
