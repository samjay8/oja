import Link from "next/link";
import { buttonClass, CHANNEL_LABEL, ChannelGlyph, Kicker, PatternBand, Stamp, Tag, type ChannelKind } from "@/components/ui";
import { DEMO_SHOP, Section, SELLER_DESK, SiteFooter, SiteHeader } from "@/components/site/chrome";
import { LANGUAGE_CODES, LANGUAGES } from "@/lib/languages";

const findings = [
  { n: 5, t: "lose sales to delivery cost or time", q: "“Delivery was delayed.”" },
  { n: 4, t: "say buyers stop replying", q: "“Before my rep could get back to them they had messaged another vendor.”" },
  { n: 4, t: "buyers were scammed, or nearly", q: "“The seller wanted me to pay to an account that wasn't the company's account.”" },
];

const steps = [
  { t: "Answers from your catalog", d: "Prices, stock and lead times come from your shop. Nothing is made up." },
  { t: "Haggles within your floor", d: "You set the lowest price. Code holds the line; the AI can't go under it." },
  { t: "Quotes delivery upfront", d: "Cost, carrier and arrival window before the buyer commits." },
  { t: "PayPal checkout, then tracking", d: "Paid into your verified business account. Tracking goes back to PayPal when you ship." },
];

const guards = [
  { t: "Money lives in code", d: "Prices, floors, delivery and totals come from Oja's own functions. The model only asks for them." },
  { t: "A guard on every reply", d: "A reply with an amount or link the code didn't make is held for the seller, never sent." },
  { t: "Copilot by default", d: "New shops approve every draft. Switch to autopilot when you trust it." },
];

const channels: ChannelKind[] = ["web", "whatsapp", "messenger", "instagram"];

const h2 = "font-display text-[1.625rem] leading-[1.15] text-strong sm:text-[2rem]";

export default function Home() {
  return (
    <div className="smooth-scroll flex flex-1 flex-col">
      <SiteHeader greet />

      <main className="flex-1">
        {/* Hero: one statement, one quiet proof */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <div className="stagger min-w-0">
            <Kicker className="enter">Ọjà · Yorùbá for “market”</Kicker>
            <h1 className="enter mt-5 max-w-[17ch] font-display text-[2rem] leading-[1.1] text-strong sm:text-[2.75rem] lg:text-[3.25rem] lg:leading-[1.06]">
              The AI sales agent that closes the chat and gets you paid.
            </h1>
            <p className="enter mt-6 max-w-[54ch] text-base leading-relaxed text-text sm:text-lg">
              Oja answers buyers in seconds from your real catalog, holds your price floor, quotes delivery and sends a
              PayPal checkout to your own verified account.
            </p>
            <div className="enter mt-8 flex flex-wrap gap-3">
              <Link href={DEMO_SHOP} className={buttonClass({ size: "lg" })}>Try the demo shop <span aria-hidden className="nudge">→</span></Link>
              <Link href={SELLER_DESK} className={buttonClass({ variant: "outline", size: "lg" })}>Open the seller desk</Link>
            </div>
          </div>
          <ChatSnippet />
        </section>

        <PatternBand pattern="stitch" className="h-2.5 border-t border-line" />

        {/* What we heard */}
        <Section label="What we heard">
          <h2 className={h2 + " max-w-[26ch]"}>Sales die in the chat, between the price and the payment.</h2>
          <dl className="mt-10 grid gap-x-10 sm:grid-cols-3">
            {findings.map((f) => (
              <div key={f.t} className="border-t border-line py-5">
                <dt className="font-mono text-[1.75rem] tabular-nums leading-none text-strong">
                  {f.n}<span className="text-base text-muted">/6</span>
                </dt>
                <dd className="mt-3 font-semibold text-strong">{f.t}</dd>
                <dd className="mt-2 text-[15px] leading-snug text-muted">{f.q}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-muted">
            Source: 6 seller and buyer interviews, Nigeria, Oct–Nov 2026
          </p>
        </Section>

        {/* How it works */}
        <Section id="how" label="How it works">
          <h2 className={h2}>Four steps, one conversation.</h2>
          <ol className="mt-10 grid gap-x-10 sm:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.t} className="grid grid-cols-[2.25rem_1fr] border-t border-line py-5">
                <span className="pt-1 font-mono text-xs tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-lg font-semibold text-strong">{s.t}</h3>
                  <p className="mt-1 leading-relaxed text-text">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* Channels + languages */}
        <Section label="Reach">
          <h2 className={h2 + " max-w-[24ch]"}>Where your buyers are, in their language.</h2>
          <div className="mt-10 grid gap-8 border-t border-line pt-6 md:grid-cols-2 md:gap-10">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-3" aria-label="Channels">
              {channels.map((c) => (
                <li key={c} className="inline-flex items-center gap-2 text-strong">
                  <ChannelGlyph kind={c} className="size-5 shrink-0 text-dye" />
                  <span className="font-semibold">{CHANNEL_LABEL[c]}</span>
                </li>
              ))}
              <li className="col-span-2"><Tag dashed>More coming</Tag></li>
            </ul>
            <div>
              <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Languages">
                {LANGUAGE_CODES.map((c) => {
                  const l = LANGUAGES[c];
                  return (
                    <li key={c} lang={c} className="inline-flex items-baseline gap-1.5 text-strong">
                      {l.native}
                      {l.beta && <span lang="en" className="font-mono text-[10px] uppercase tracking-wider text-muted">beta</span>}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-sm text-muted">
                Beta languages haven&apos;t been reviewed by native speakers yet. Prices always stay digits from the code.
              </p>
            </div>
          </div>
        </Section>

        {/* Safety */}
        <section className="bg-aro-900 text-aro-50">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-[12rem_1fr] lg:gap-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aro-300 lg:pt-2">Enforced in code</p>
            <div className="min-w-0">
              <h2 className="font-display text-[1.625rem] leading-[1.15] sm:text-[2rem]">The AI never touches the money.</h2>
              <ul className="mt-10 grid gap-x-10 md:grid-cols-3">
                {guards.map((g) => (
                  <li key={g.t} className="border-t border-aro-700 py-5">
                    <h3 className="font-semibold">{g.t}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-aro-200">{g.d}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-20 sm:px-8 sm:py-24 lg:grid-cols-[12rem_1fr] lg:gap-12">
          <span aria-hidden className="hidden lg:block" />
          <div className="min-w-0">
            <h2 className={h2}>Walk into the stall.</h2>
            <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-text sm:text-lg">
              Chat with Ifẹ́ Textiles as a buyer, haggle a little, then watch the same chat from the seller&apos;s desk.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={DEMO_SHOP} className={buttonClass({ size: "lg" })}>Try the demo shop <span aria-hidden className="nudge">→</span></Link>
              <Link href={SELLER_DESK} className={buttonClass({ variant: "outline", size: "lg" })}>Open the seller desk</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/** Illustrative sample: three messages that end in a paid order. */
function ChatSnippet() {
  return (
    <figure aria-label="Example chat that ends in a paid order" className="enter w-full max-w-md justify-self-start lg:justify-self-end" style={{ animationDelay: "240ms" }}>
      <div className="border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <span className="text-sm font-semibold text-strong">Ifẹ́ Textiles</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Oja · AI assistant</span>
        </div>
        <div className="space-y-2.5 px-4 py-4 text-[15px] leading-snug">
          <p className="ml-auto w-fit max-w-[85%] bg-dye px-3 py-2 text-on-dye">Last price for the adire two-piece?</p>
          <p className="w-fit max-w-[88%] border border-line px-3 py-2 text-text">
            I can do <span className="font-mono text-sm">$76</span>. Delivery to London is <span className="font-mono text-sm">$38</span> by DHL Express, 4–6 days, tracked.
          </p>
          <p className="ml-auto w-fit max-w-[85%] bg-dye px-3 py-2 text-on-dye">Deal. How do I pay?</p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-dashed border-line-strong px-4 py-3">
          <span className="font-mono text-xs text-text">PayPal checkout · <span className="tabular-nums text-strong">$114.00</span></span>
          <Stamp filled>Paid</Stamp>
        </div>
      </div>
      <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted">Sample chat · demo data</figcaption>
    </figure>
  );
}
