import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { channelConnections, deliveryZones } from "@/db/schema";
import { CHANNEL_LABEL, ChannelGlyph, Kicker, Price, Stamp, Tag, Wordmark } from "@/components/ui";
import { channelLink } from "@/lib/channels/links";
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
    <main aria-busy className="fade mx-auto w-full max-w-6xl flex-1 px-4 pt-6 sm:px-8 sm:pt-8">
      <p className="sr-only" role="status">Opening the shop…</p>
      <div className="space-y-2">
        <div className="h-3 w-24 bg-sunk" />
        <div className="h-8 w-64 max-w-full bg-sunk" />
      </div>
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="h-[70svh] border border-line bg-surface" />
        <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-16 border-b border-line" />)}</div>
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

const SectionTitle = ({ id, children }: { id: string; children: ReactNode }) => (
  <h2 id={id} className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">{children}</h2>
);

async function Shop({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const q = await searchParams;
  await connection(); // database reads are per request, never prerendered
  const notice: PaymentNotice = typeof q.order === "string" && typeof q.payment === "string" ? { order: q.order, payment: q.payment } : null;
  const db = await getDb();
  const vendor = await vendorBySlug(db, slug);
  if (!vendor) notFound();
  const [items, reviews, zones, connections] = await Promise.all([
    searchCatalog(db, vendor.id),
    reviewsFor(db, vendor.id),
    db.select().from(deliveryZones).where(eq(deliveryZones.vendorId, vendor.id)),
    // Public columns only: tokens and API ids never leave the server.
    db.select({ channel: channelConnections.channel, publicHandle: channelConnections.publicHandle })
      .from(channelConnections)
      .where(and(eq(channelConnections.vendorId, vendor.id), eq(channelConnections.active, true), isNotNull(channelConnections.publicHandle)))
      .orderBy(asc(channelConnections.createdAt)),
  ]);
  const money = (minor: number) => format(minor, vendor.currency);
  // One link per channel, only for handles that make a valid deep link.
  const elsewhere: { channel: (typeof connections)[number]["channel"]; href: string }[] = [];
  for (const c of connections) {
    const href = channelLink(c.channel, c.publicHandle, { text: `Hi ${vendor.name}, I'm interested in…` });
    if (href && !elsewhere.some((e) => e.channel === c.channel)) elsewhere.push({ channel: c.channel, href });
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-6 sm:px-8 sm:pt-8">
      <section className="fade">
        <Kicker>{regionName(vendor.country)}</Kicker>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-display text-3xl leading-tight text-strong sm:text-4xl">{vendor.name}</h1>
          {vendor.paypalVerified && <Stamp filled tilt={false}>Verified payee</Stamp>}
        </div>
        {vendor.tagline && <p className="mt-1.5 max-w-[60ch] text-text">{vendor.tagline}</p>}
        {elsewhere.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 text-muted">Also chat with {vendor.name} on</span>
            {elsewhere.map((c) => (
              <a
                key={c.channel}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="ease-ui inline-flex min-h-11 items-center gap-1.5 border border-line bg-surface px-3 text-strong hover:border-dye hover:text-dye sm:min-h-9"
              >
                <ChannelGlyph kind={c.channel} className="size-4" />
                {CHANNEL_LABEL[c.channel]}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label={`Chat with ${vendor.name}`} className="fade flex h-[80svh] max-h-[52rem] min-h-[30rem] flex-col border border-line-strong bg-surface">
          <ShopChat shop={vendor.slug} shopName={vendor.name} notice={notice} />
        </section>

        <aside className="min-w-0 space-y-10">
          <section aria-labelledby="catalog-h">
            <SectionTitle id="catalog-h">Catalog</SectionTitle>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {items.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 font-semibold leading-snug text-strong">{p.name}</p>
                    <Price className="shrink-0">{money(p.listPriceMinor)}</Price>
                  </div>
                  {p.description && <p className="mt-0.5 text-sm text-muted">{p.description}</p>}
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                    {p.stock === null
                      ? `Made to order${p.leadTimeDays ? ` · ${p.leadTimeDays} days` : ""}`
                      : p.stock > 0 ? `${p.stock} in stock` : "Sold out"}
                  </p>
                  {p.tiers.length > 0 && (
                    <p className="font-mono text-[11px] leading-relaxed text-muted">
                      Group price: {p.tiers.map((t) => `${t.minQty}+ at ${money(Math.max(t.unitPriceMinor, p.minPriceMinor))}`).join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {zones.length > 0 && (
            <section aria-labelledby="delivery-h">
              <SectionTitle id="delivery-h">Delivery</SectionTitle>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {zones.map((z) => (
                  <li key={z.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="text-strong">{z.region ? `${z.region}, ${regionName(z.country)}` : regionName(z.country)}</p>
                      <p className="text-xs text-muted">
                        {z.carrier} · {z.etaDaysMax === 0 ? "same day" : `${z.etaDaysMin}–${z.etaDaysMax} days`}{z.tracked ? " · tracked" : ""}
                      </p>
                    </div>
                    <Price size="sm" className="shrink-0">{money(z.costMinor)}</Price>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {reviews.length > 0 && (
            <section aria-labelledby="reviews-h">
              <div className="flex items-center justify-between gap-2">
                <SectionTitle id="reviews-h">Reviews</SectionTitle>
                <Tag dashed>Sample</Tag>
              </div>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {reviews.slice(0, 3).map((r) => (
                  <li key={r.id} className="py-3">
                    <p className="text-sm leading-relaxed text-text">{r.body}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      {r.author} · <span aria-hidden>{r.rating}/5</span><span className="sr-only">{r.rating} out of 5</span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs leading-relaxed text-muted">
            {vendor.paypalVerified && <>Checkout always pays {vendor.name}&apos;s own PayPal business account. Never pay anyone else&apos;s. </>}
            PayPal sandbox: no real money moves. Demo shop with sample data.
          </p>
        </aside>
      </div>
    </main>
  );
}
