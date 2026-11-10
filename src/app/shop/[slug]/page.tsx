import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { deliveryZones } from "@/db/schema";
import { Kicker, PatternBand, Price, Stamp, Swatch, Tag, Wordmark } from "@/components/ui";
import { reviewsFor, searchCatalog, vendorBySlug } from "@/lib/commerce";
import { format } from "@/lib/money";
import { ShopChat, type PaymentNotice } from "./shop-chat";

export default function ShopPage(props: PageProps<"/shop/[slug]">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link href="/" aria-label="Oja home"><Wordmark size="sm" /></Link>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">PayPal sandbox</span>
        </div>
      </header>
      <Suspense fallback={<ShopSkeleton />}>
        <Shop params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function ShopSkeleton() {
  return (
    <main aria-busy className="fade mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[1fr_22rem]">
      <p className="sr-only" role="status">Opening the shop…</p>
      <div className="adire-dots h-[70svh] border border-dashed border-line-strong" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="swatch h-32 border border-line bg-sunk" />)}
      </div>
    </main>
  );
}

const regionName = (code: string) => {
  if (code === "*") return "Everywhere else";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

async function Shop({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const q = await searchParams;
  await connection(); // database reads are per request, never prerendered
  const notice: PaymentNotice = typeof q.order === "string" && typeof q.payment === "string" ? { order: q.order, payment: q.payment } : null;
  const db = await getDb();
  const vendor = await vendorBySlug(db, slug);
  if (!vendor) notFound();
  const [items, reviews, zones] = await Promise.all([
    searchCatalog(db, vendor.id),
    reviewsFor(db, vendor.id),
    db.select().from(deliveryZones).where(eq(deliveryZones.vendorId, vendor.id)),
  ]);
  const money = (minor: number) => format(minor, vendor.currency);

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-line">
        <PatternBand pattern="olokun" className="pointer-events-none absolute inset-0 opacity-60" />
        <div className="stagger relative mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8 [&>*]:[animation:rise_var(--dur-3)_var(--ease-out)_both]">
          <Kicker>Shop · {regionName(vendor.country)}</Kicker>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="font-display text-4xl leading-none text-strong sm:text-5xl">{vendor.name}</h1>
            <div className="flex items-center gap-2">
              {vendor.paypalVerified && <Stamp filled>Verified payee</Stamp>}
              <Tag dashed>Demo shop</Tag>
            </div>
          </div>
          {vendor.tagline && <p className="mt-2 max-w-[65ch] text-text">{vendor.tagline}</p>}
          {vendor.paypalVerified && (
            <p className="mt-2 max-w-[65ch] text-sm text-muted">
              Checkout always pays {vendor.name}&apos;s own PayPal business account. Never pay anyone else&apos;s account.
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label={`Chat with ${vendor.name}`} className="fade flex h-[80svh] max-h-[52rem] min-h-[30rem] flex-col border border-line-strong bg-surface shadow-[5px_5px_0_0_var(--line)]">
          <ShopChat shop={vendor.slug} shopName={vendor.name} notice={notice} />
        </section>

        <aside className="min-w-0 space-y-8">
          <section aria-labelledby="catalog-h">
            <h2 id="catalog-h" className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Catalog · {items.length} items</h2>
            <ul className="mt-3 space-y-3">
              {items.map((p) => (
                <Swatch key={p.id} as="li" pattern="stitch" className="lift">
                  <div className="p-4">
                    <p className="pr-4 font-semibold leading-snug text-strong">{p.name}</p>
                    {p.description && <p className="mt-1 text-sm text-muted">{p.description}</p>}
                    <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                      <Price size="lg">{money(p.listPriceMinor)}</Price>
                      {p.stock === null
                        ? <Tag dashed>Made to order{p.leadTimeDays ? ` · ${p.leadTimeDays} days` : ""}</Tag>
                        : p.stock > 0 ? <Tag>{p.stock} in stock</Tag> : <Tag dashed>Sold out</Tag>}
                    </div>
                    {p.tiers.length > 0 && (
                      <dl className="mt-3 border-t border-dashed border-line-strong pt-2">
                        <dt className="font-mono text-[10px] uppercase tracking-wider text-muted">Group price</dt>
                        {p.tiers.map((t) => (
                          <dd key={t.minQty} className="flex justify-between font-mono text-xs text-text">
                            <span>{t.minQty}+ pieces</span>
                            <Price size="sm">{money(Math.max(t.unitPriceMinor, p.minPriceMinor))} each</Price>
                          </dd>
                        ))}
                      </dl>
                    )}
                  </div>
                </Swatch>
              ))}
            </ul>
          </section>

          {zones.length > 0 && (
            <section aria-labelledby="delivery-h">
              <h2 id="delivery-h" className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Delivery, quoted upfront</h2>
              <ul className="mt-3 divide-y divide-line border border-line bg-surface">
                {zones.map((z) => (
                  <li key={z.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-strong">{z.region ? `${z.region}, ${regionName(z.country)}` : regionName(z.country)}</p>
                      <p className="text-xs text-muted">
                        {z.carrier} · {z.etaDaysMax === 0 ? "same day" : `${z.etaDaysMin}–${z.etaDaysMax} days`}{z.tracked ? " · tracked" : ""}
                      </p>
                    </div>
                    <Price size="sm">{money(z.costMinor)}</Price>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {reviews.length > 0 && (
            <section aria-labelledby="reviews-h">
              <div className="flex items-center justify-between gap-2">
                <h2 id="reviews-h" className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">What buyers say</h2>
                <Tag dashed>Sample reviews</Tag>
              </div>
              <ul className="mt-3 space-y-3">
                {reviews.slice(0, 3).map((r) => (
                  <li key={r.id} className="border-l-2 border-dye pl-3">
                    <p className="flex items-center gap-2">
                      <span aria-hidden className="inline-flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={`size-2 border border-dye ${n <= r.rating ? "bg-dye" : ""}`} />
                        ))}
                      </span>
                      <span className="sr-only">{r.rating} out of 5</span>
                      <span className="font-mono text-[11px] text-muted">{r.author}</span>
                    </p>
                    <p className="mt-1 font-display text-base leading-snug text-text">“{r.body}”</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="border border-dashed border-line-strong px-3 py-2 font-mono text-[10px] uppercase leading-relaxed tracking-wider text-muted">
            PayPal sandbox · no real money moves · sample shop data
          </p>
        </aside>
      </div>
    </main>
  );
}
