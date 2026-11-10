import Link from "next/link";
import { buttonClass, CHANNEL_LABEL, ChannelGlyph, Kicker, PatternBand, Price, Stamp, Swatch, Tag, Wordmark, type ChannelKind } from "@/components/ui";
import { LANGUAGE_CODES, LANGUAGES } from "@/lib/languages";

const DEMO_SHOP = "/shop/ife-textiles";
const SELLER_DESK = "/vendor/ife-textiles";

const findings = [
  { n: 5, t: "said delivery cost or time loses sales", q: "“Delivery was delayed.”" },
  { n: 4, t: "said buyers stop replying", q: "“Before my rep could get back to them they had messaged another vendor.”" },
  { n: 4, t: "buyers had been scammed, or nearly", q: "“The seller wanted me to pay to an account that wasn't the company's account.”" },
];

const steps = [
  { t: "Answers from your catalog", d: "Prices, stock and lead times come from your shop. Nothing is made up." },
  { t: "Haggles within your floor", d: "You set the lowest price. Code holds the line; the AI can't go under it." },
  { t: "Quotes delivery upfront", d: "Cost, carrier and arrival window before the buyer commits." },
  { t: "PayPal checkout, then tracking", d: "Paid into your verified business account. Tracking goes back to PayPal when you ship." },
];

const guards = [
  { t: "Money lives in code", d: "Prices, floors, delivery and totals are computed by Oja's own functions. The model only asks for them." },
  { t: "The money guard", d: "Any reply with an amount or a link the code didn't make is held for the seller, never sent." },
  { t: "Copilot by default", d: "New shops approve every draft. Switch to autopilot when you trust it." },
];

const channels: ChannelKind[] = ["web", "whatsapp", "messenger", "instagram"];

export default function Home() {
  return (
    <div className="smooth-scroll flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/" aria-label="Oja home"><Wordmark size="sm" /></Link>
        <nav className="fade flex items-center gap-1 text-sm">
          <a href="#how" className={buttonClass({ variant: "ghost", size: "sm" }) + " hidden sm:inline-flex"}>How it works</a>
          <Link href={DEMO_SHOP} className={buttonClass({ variant: "ghost", size: "sm" })}>Demo shop</Link>
          <Link href={SELLER_DESK} className={buttonClass({ variant: "ghost", size: "sm" })}>Seller desk</Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-y border-line">
          <PatternBand pattern="olokun" className="pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-8 sm:py-20 lg:grid-cols-[1.25fr_1fr] lg:items-end">
            <div className="stagger min-w-0">
              <Kicker className="enter">Ọjà · Yorùbá for “market”</Kicker>
              <p aria-hidden className="enter mt-2 font-display text-[7.5rem] leading-[0.8] tracking-tight text-strong sm:text-[12rem] lg:text-[15rem]">Ọjà</p>
              <h1 className="enter mt-6 max-w-2xl font-display text-4xl leading-[1.05] text-strong sm:text-6xl">
                The AI sales agent that closes the chat and gets you paid.
              </h1>
              <p className="enter mt-5 max-w-[60ch] text-lg leading-relaxed text-text">
                Buyers ask, haggle and go quiet. Oja answers in seconds from your real catalog, holds your price floor,
                quotes delivery and sends a PayPal checkout to your own verified account.
              </p>
              <div className="enter mt-8 flex flex-wrap gap-3">
                <Link href={DEMO_SHOP} className={buttonClass({ size: "lg" })}>Try the demo shop</Link>
                <Link href={SELLER_DESK} className={buttonClass({ variant: "outline", size: "lg" })}>Open the seller desk</Link>
              </div>
            </div>
            <SampleReceipt />
          </div>
        </section>

        {/* Problem */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <Kicker>What we heard in the market</Kicker>
          <h2 className="mt-2 max-w-3xl font-display text-3xl leading-tight text-strong sm:text-5xl">
            Sales die in the chat, between the price and the payment.
          </h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {findings.map((f) => (
              <Swatch key={f.t} as="li" pattern="stitch" className="lift flex flex-col">
                <div className="flex flex-1 flex-col p-5">
                  <p className="font-mono text-5xl tabular-nums text-strong">
                    {f.n}<span className="text-2xl text-muted">/6</span>
                  </p>
                  <p className="mt-2 font-semibold text-strong">{f.t}</p>
                  <p className="mt-4 flex-1 font-display text-lg leading-snug text-text">{f.q}</p>
                </div>
              </Swatch>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-muted">
            Source: 6 seller and buyer interviews, Nigeria, Oct–Nov 2026
          </p>
          <p className="mt-8 max-w-2xl border-l-2 border-dye pl-4 font-display text-2xl leading-snug text-strong">
            For buyers: pay the real business, with PayPal protection, and know when it arrives.
          </p>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-4 border-y border-line bg-sunk">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
            <Kicker>How it works</Kicker>
            <h2 className="mt-2 font-display text-3xl text-strong sm:text-5xl">Four steps, one conversation.</h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <Swatch key={s.t} as="li" className="lift p-5">
                  <p className="font-mono text-xs tracking-[0.2em] text-muted">STEP {String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-3 font-display text-2xl leading-tight text-strong">{s.t}</h3>
                  <p className="mt-2 text-sm text-text">{s.d}</p>
                </Swatch>
              ))}
            </ol>
          </div>
        </section>

        {/* Channels + languages */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-8 lg:grid-cols-2">
          <div>
            <Kicker>One agent, every chat</Kicker>
            <h2 className="mt-2 font-display text-3xl text-strong sm:text-4xl">Where your buyers already talk.</h2>
            <ul className="mt-6 grid grid-cols-2 border-l border-t border-line">
              {channels.map((c) => (
                <li key={c} className="flex items-center gap-3 border-b border-r border-line bg-surface px-4 py-4 text-strong">
                  <ChannelGlyph kind={c} className="size-6 shrink-0" />
                  <span className="font-semibold">{CHANNEL_LABEL[c]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3"><Tag dashed>More coming</Tag></p>
          </div>
          <div>
            <Kicker>Speaks the buyer&apos;s language</Kicker>
            <h2 className="mt-2 font-display text-3xl text-strong sm:text-4xl">From Lagos to Lyon to Shenzhen.</h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {LANGUAGE_CODES.map((c) => {
                const l = LANGUAGES[c];
                return (
                  <li key={c} lang={c} className="flex items-center gap-2 border border-line bg-surface px-3 py-2">
                    <span className="font-semibold text-strong">{l.native}</span>
                    {l.beta && <Tag dashed>beta</Tag>}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm text-muted">Beta languages haven&apos;t been reviewed by native speakers yet. Prices always stay as digits from the code.</p>
          </div>
        </section>

        {/* Safety */}
        <section className="relative overflow-hidden bg-dye text-on-dye">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] opacity-80">Safety</p>
              <span className="inline-block -rotate-2 border-2 border-on-dye px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Enforced in code</span>
            </div>
            <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight sm:text-6xl">The AI never touches the money.</h2>
            <ul className="mt-10 grid gap-px bg-on-dye/25 md:grid-cols-3">
              {guards.map((g, i) => (
                <li key={g.t} className="bg-dye p-5">
                  <p className="font-mono text-xs opacity-70">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-2 text-lg font-semibold">{g.t}</h3>
                  <p className="mt-1 text-sm opacity-85">{g.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-8">
          <p className="font-display text-4xl text-strong sm:text-5xl">Walk into the stall.</p>
          <p className="mx-auto mt-3 max-w-lg text-text">Chat with Ifẹ́ Textiles as a buyer, haggle a little, then watch the same chat from the seller&apos;s desk.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={DEMO_SHOP} className={buttonClass({ size: "lg" })}>Try the demo shop</Link>
            <Link href={SELLER_DESK} className={buttonClass({ variant: "outline", size: "lg" })}>Open the seller desk</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <PatternBand pattern="dots" className="h-4 border-b border-line" />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-8">
          <Wordmark size="sm" kicker={false} />
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
            Hackathon build · PayPal sandbox only · demo shops are sample data
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Illustrative sample: a haggle closed into a stamped receipt. */
function SampleReceipt() {
  return (
    <figure aria-label="Example: a chat that ends in a paid order" className="enter w-full max-w-sm justify-self-center lg:justify-self-end" style={{ animationDelay: "240ms" }}>
      <div className="receipt-edge border border-b-0 border-line bg-surface px-5 pt-5 shadow-[6px_6px_0_0_var(--line)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Kicker>Order</Kicker>
            <p className="font-mono text-sm text-strong">OJA-7K2Q</p>
          </div>
          <Stamp filled className="text-xs">Paid</Stamp>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <p className="ml-auto w-fit max-w-[85%] bg-dye px-3 py-2 text-on-dye">Last price for the adire two-piece?</p>
          <p className="w-fit max-w-[85%] border border-line px-3 py-2 text-text">I can do $76 for you. Delivery to London is $38 by DHL Express, 4–6 days, tracked.</p>
        </div>
        <dl className="mt-4 space-y-1 border-t border-dashed border-line-strong pt-3 font-mono text-xs text-text">
          <div className="flex justify-between"><dt>Adire two-piece × 1</dt><dd><Price size="sm">$76.00</Price></dd></div>
          <div className="flex justify-between"><dt>Delivery · DHL Express</dt><dd><Price size="sm">$38.00</Price></dd></div>
          <div className="flex justify-between border-t border-line pt-1 font-bold text-strong"><dt>Total</dt><dd><Price size="sm">$114.00</Price></dd></div>
        </dl>
        <p className="mt-3 pb-3 font-mono text-[10px] uppercase tracking-wider text-muted">Paid to verified payee · Ifẹ́ Textiles</p>
      </div>
      <figcaption className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-muted">Sample receipt</figcaption>
    </figure>
  );
}
