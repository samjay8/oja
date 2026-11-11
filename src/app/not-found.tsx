import Link from "next/link";
import { buttonClass, Kicker } from "@/components/ui";
import { DEMO_SHOP, SiteFooter, SiteHeader } from "@/components/site/chrome";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center border-t border-line">
        <div className="stagger mx-auto w-full max-w-6xl px-4 py-20 sm:px-8 sm:py-28">
          <Kicker className="enter">404 · Not found</Kicker>
          <h1 className="enter mt-4 max-w-[20ch] font-display text-[2rem] leading-[1.1] text-strong sm:text-[2.75rem]">
            This stall isn&apos;t in the market.
          </h1>
          <p className="enter mt-4 max-w-[52ch] text-base leading-relaxed text-text sm:text-lg">
            The link may be mistyped, or the seller has packed up for the day. Head back, or walk into the demo shop.
          </p>
          <div className="enter mt-8 flex flex-wrap gap-3">
            <Link href="/" className={buttonClass()}>Back to Ọjà</Link>
            <Link href={DEMO_SHOP} className={buttonClass({ variant: "outline" })}>Visit the demo shop</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
