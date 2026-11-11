import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getDb } from "@/db";
import { DeskNav } from "@/components/desk/desk-nav";
import { buttonClass, Wordmark } from "@/components/ui";
import { vendorBySlug } from "@/lib/commerce";

export default function DeskLayout({ children, params }: LayoutProps<"/vendor/[slug]">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div aria-hidden className="adire-stitch h-2 border-b border-line" />
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-3 sm:px-6">
          <div className="flex min-w-0 items-baseline gap-3">
            <Link href="/" aria-label="Oja home" className="shrink-0"><Wordmark size="sm" kicker={false} /></Link>
            <span aria-hidden className="text-line-strong">/</span>
            <Suspense fallback={<span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Seller desk</span>}>
              <ShopName params={params} />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <ViewShop params={params} />
          </Suspense>
        </div>
        <div className="mx-auto w-full max-w-7xl px-1 sm:px-3">
          <Suspense fallback={<div className="h-11 sm:h-[41px]" />}>
            <DeskNav />
          </Suspense>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

async function ShopName({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection();
  const vendor = await vendorBySlug(await getDb(), slug);
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="truncate font-display text-lg text-strong">{vendor?.name ?? slug}</span>
      <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted sm:inline">Seller desk</span>
    </span>
  );
}

async function ViewShop({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Link href={`/shop/${slug}`} target="_blank" rel="noopener" className={buttonClass({ variant: "outline", size: "sm" })}>
      View shop <span aria-hidden>↗</span><span className="sr-only">(opens in a new tab)</span>
    </Link>
  );
}
