// Shared chrome for the public site (landing, 404): header lockup with the
// living mark, and a one-line footer. Server-safe, CSS-only motion.

import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass, Logomark } from "@/components/ui";

export const DEMO_SHOP = "/shop/ife-textiles";
export const SELLER_DESK = "/vendor/ife-textiles";

/** Logomark + Ọjà. On hover/focus the àmì nods and a small greeting fades in beside it. */
export function SiteLockup({ greet = false }: { greet?: boolean }) {
  return (
    <Link href="/" aria-label="Ọjà home" className="relative inline-flex items-center gap-2 py-1 text-strong">
      <Logomark greet={greet} className="size-7 shrink-0" />
      <span lang="yo" className="font-display text-2xl leading-none tracking-tight">Ọjà</span>
      <span
        aria-hidden
        className="oja-greet absolute left-0 top-full z-10 mt-2 whitespace-nowrap border border-line bg-surface px-2.5 py-1 text-[13px] text-text sm:left-full sm:top-1/2 sm:mt-0 sm:ml-3 sm:-translate-y-1/2"
      >
        <span lang="yo" className="font-semibold text-strong">Ẹ káàbọ̀</span>
        <span className="text-muted"> · how can I help?</span>
      </span>
    </Link>
  );
}

export function SiteHeader({ greet = false }: { greet?: boolean }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
      <SiteLockup greet={greet} />
      <nav aria-label="Main" className="flex items-center gap-1 text-sm">
        <Link href="/#how" className={buttonClass({ variant: "ghost", size: "sm" }) + " whitespace-nowrap max-sm:hidden"}>How it works</Link>
        <Link href={DEMO_SHOP} className={buttonClass({ variant: "ghost", size: "sm" }) + " whitespace-nowrap"}>Demo shop</Link>
        <Link href={SELLER_DESK} className={buttonClass({ variant: "ghost", size: "sm" }) + " whitespace-nowrap"}>Seller desk</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-8 sm:px-8">
        <span className="oja-live inline-flex items-center gap-2 text-strong">
          <Logomark className="size-5 shrink-0" />
          <span lang="yo" className="font-display text-lg leading-none">Ọjà</span>
        </span>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
          Hackathon build · PayPal sandbox only · demo shops are sample data
        </p>
      </div>
    </footer>
  );
}

/** Section frame: a small label column on the left, content on the right (stacks on phones). */
export function Section({ id, label, children, className = "" }: { id?: string; label: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={"scroll-mt-6 border-t border-line " + className}>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-[12rem_1fr] lg:gap-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted lg:pt-2">{label}</p>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
