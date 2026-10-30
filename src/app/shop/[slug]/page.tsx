import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getDb } from "@/db";
import { searchCatalog, vendorBySlug } from "@/lib/commerce";
import { format } from "@/lib/money";
import { ShopChat, type PaymentNotice } from "./shop-chat";

export default function ShopPage(props: PageProps<"/shop/[slug]">) {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Opening the shop…</p>}>
      <Shop params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Shop({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const q = await searchParams;
  await connection(); // database reads are per request, never prerendered
  const notice: PaymentNotice = typeof q.order === "string" && typeof q.payment === "string" ? { order: q.order, payment: q.payment } : null;
  const db = await getDb();
  const vendor = await vendorBySlug(db, slug);
  if (!vendor) notFound();
  const items = await searchCatalog(db, vendor.id);

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[1fr_22rem]">
      <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <header className="border-b border-line px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl">{vendor.name}</h1>
            {vendor.paypalVerified && (
              <span className="rounded-full bg-indigo-soft px-2.5 py-0.5 text-xs font-semibold text-indigo">Verified payee</span>
            )}
            <span className="rounded-full bg-ochre-soft px-2.5 py-0.5 text-xs font-semibold text-warn">Demo shop</span>
          </div>
          {vendor.tagline && <p className="mt-1 text-sm text-muted">{vendor.tagline}</p>}
          <p className="mt-1 text-xs text-muted">You&apos;re chatting with Oja, {vendor.name}&apos;s AI sales assistant. The seller can join at any time.</p>
        </header>
        <ShopChat shop={vendor.slug} shopName={vendor.name} notice={notice} />
      </section>

      <aside className="space-y-3">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-widest text-muted">Catalog</h2>
        {items.map((p) => (
          <div key={p.id} className="rounded-xl border border-line bg-surface p-4">
            <p className="font-semibold">{p.name}</p>
            <p className="mt-0.5 text-sm text-muted">{p.description}</p>
            <p className="mt-2 font-display text-lg">{format(p.listPriceMinor, vendor.currency)}</p>
            {p.tiers.length > 0 && (
              <p className="text-xs text-muted">
                Group price: {p.tiers.map((t) => `${t.minQty}+ at ${format(Math.max(t.unitPriceMinor, p.minPriceMinor), vendor.currency)}`).join(" · ")}
              </p>
            )}
            <p className="mt-1 text-xs text-muted">
              {p.stock === null ? `Made to order${p.leadTimeDays ? `, ${p.leadTimeDays} days` : ""}` : `${p.stock} in stock`}
            </p>
          </div>
        ))}
        <p className="px-1 text-xs text-muted">PayPal sandbox: no real money moves.</p>
      </aside>
    </main>
  );
}
