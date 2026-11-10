import Link from "next/link";
import { buttonClass, Kicker, PatternBand, Stamp, Wordmark } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <PatternBand pattern="dots" className="pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-md">
        <div className="print-in receipt-edge border border-b-0 border-line-strong bg-surface px-6 pt-6 shadow-[6px_6px_0_0_var(--line)]">
          <div className="flex items-start justify-between gap-3">
            <Wordmark size="sm" />
            <Stamp>Not found</Stamp>
          </div>
          <p className="mt-6 font-mono text-6xl tabular-nums text-strong">404</p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-strong">This stall isn&apos;t in the market.</h1>
          <p className="mt-2 max-w-[65ch] text-text">The link may be mistyped, or the seller has packed up for the day. You can head back, or try the demo shop.</p>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-dashed border-line-strong pb-4 pt-5">
            <Link href="/" className={buttonClass()}>Back to Oja</Link>
            <Link href="/shop/ife-textiles" className={buttonClass({ variant: "outline" })}>Visit the demo shop</Link>
          </div>
        </div>
        <Kicker className="fade mt-4 text-center">Ọjà · market agent</Kicker>
      </div>
    </main>
  );
}
