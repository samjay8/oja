import Link from "next/link";

const steps = [
  { t: "Answers from your real catalog", d: "Prices, stock and delivery come from your shop, never made up." },
  { t: "Haggles within your limits", d: "You set the lowest price. Code enforces it; the AI can't go below it." },
  { t: "Quotes delivery upfront", d: "Cost, carrier and arrival time before the buyer commits." },
  { t: "Gets you paid safely", d: "PayPal checkout to your verified account, tracking added after you ship." },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-8 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-ochre">Oja · Ọjà means market</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight sm:text-6xl">
        The AI sales agent that closes the chat and gets you paid.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Buyers ask, haggle and go quiet in chat. Oja replies in seconds, holds your price floor, quotes delivery,
        and sends a PayPal checkout to your own verified account. You stay in control: approve its drafts, or let it run.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/shop/ife-textiles" className="rounded-full bg-indigo px-6 py-3 font-semibold text-surface hover:opacity-90">
          Try the demo shop as a buyer
        </Link>
        <Link href="/vendor/ife-textiles" className="rounded-full border border-line bg-surface px-6 py-3 font-semibold hover:border-indigo">
          Open the seller inbox
        </Link>
      </div>

      <section className="mt-14 grid gap-4 sm:grid-cols-2">
        {steps.map((s, i) => (
          <div key={s.t} className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-display text-2xl text-ochre">{i + 1}</p>
            <h2 className="mt-1 text-lg font-semibold">{s.t}</h2>
            <p className="mt-1 text-muted">{s.d}</p>
          </div>
        ))}
      </section>

      <p className="mt-12 text-sm text-muted">
        Hackathon build. Payments run on the PayPal sandbox; no real money moves. Demo shops and reviews are sample data.
      </p>
    </main>
  );
}
