"use client";

import { useState } from "react";
import { Button, EmptyState, Field, Kicker, Price, Stamp, Swatch, Tag, TextArea } from "@/components/ui";
import { DeskHeading, Loading, Notice, sendJson, Toggle, useDeskData } from "@/components/desk/bits";
import { SignIn } from "@/components/desk/sign-in";
import { format, type Currency } from "@/lib/money";

type Product = {
  id: string; name: string; description: string; listPriceMinor: number; minPriceMinor: number;
  tiers: { minQty: number; unitPriceMinor: number }[]; stock: number | null; leadTimeDays: number;
  imageUrl: string | null; videoUrl: string | null; active: boolean;
};
type Zone = { id: string; country: string; region: string | null; costMinor: number; etaDaysMin: number; etaDaysMax: number; carrier: string; tracked: boolean };
type Catalog = { currency: Currency; country: string; products: Product[]; zones: Zone[] };

const dec = (minor: number) => (minor % 100 ? (minor / 100).toFixed(2) : String(minor / 100));

type ProductForm = {
  name: string; description: string; listPrice: string; minPrice: string; stock: string; leadTimeDays: string;
  tiers: { minQty: string; unitPrice: string }[]; videoUrl: string; active: boolean;
};
const blankProduct: ProductForm = { name: "", description: "", listPrice: "", minPrice: "", stock: "", leadTimeDays: "0", tiers: [], videoUrl: "", active: true };
const productForm = (p: Product): ProductForm => ({
  name: p.name, description: p.description, listPrice: dec(p.listPriceMinor), minPrice: dec(p.minPriceMinor),
  stock: p.stock === null ? "" : String(p.stock), leadTimeDays: String(p.leadTimeDays),
  tiers: p.tiers.map((t) => ({ minQty: String(t.minQty), unitPrice: dec(t.unitPriceMinor) })), videoUrl: p.videoUrl ?? "", active: p.active,
});

type ZoneForm = { country: string; region: string; cost: string; etaDaysMin: string; etaDaysMax: string; carrier: string; tracked: boolean };
const blankZone = (country: string): ZoneForm => ({ country, region: "", cost: "", etaDaysMin: "1", etaDaysMax: "3", carrier: "", tracked: true });
const zoneForm = (z: Zone): ZoneForm => ({ country: z.country, region: z.region ?? "", cost: dec(z.costMinor), etaDaysMin: String(z.etaDaysMin), etaDaysMax: String(z.etaDaysMax), carrier: z.carrier, tracked: z.tracked });

export function CatalogEditor({ slug }: { slug: string }) {
  const { data, status, reload } = useDeskData<Catalog>(`/api/vendor/${slug}/catalog`);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [editingZone, setEditingZone] = useState<string | "new" | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const api = `/api/vendor/${slug}/catalog`;

  if (status === 401) return <SignIn slug={slug} onDone={reload} />;
  if (status !== null && status !== 200 && !data) return <div className="mx-auto w-full max-w-5xl px-4 py-8"><Notice tone="error">Couldn&apos;t load the catalog ({status || "network error"}).</Notice></div>;
  if (!data) return <Loading label="Loading catalog…" />;
  const cur = data.currency;

  async function run(fn: () => Promise<unknown>, ok: string) {
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "ok", text: ok });
      reload();
      return true;
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Failed" });
      return false;
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-6 sm:px-6">
      <DeskHeading kicker={`Catalog · prices in ${cur}`} title="What Oja can sell">
        <Button onClick={() => { setEditing("new"); setMsg(null); }} disabled={editing === "new"}>Add product</Button>
      </DeskHeading>

      <Notice>
        Oja quotes only what&apos;s here. It opens at the list price and can haggle down, but code stops it at your minimum price: the AI can never go below it, and buyers never see it.
      </Notice>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {editing === "new" && (
        <ProductEditor
          currency={cur}
          initial={blankProduct}
          onCancel={() => setEditing(null)}
          onSave={async (f) => (await run(() => sendJson(api, "POST", { kind: "product", ...productPayload(f) }), "Product added.")) && setEditing(null)}
        />
      )}

      <section aria-label="Products" className="space-y-3">
        {data.products.length === 0 && editing !== "new" && (
          <EmptyState title="No products yet" body="Add your first item with a list price and the lowest price you'll accept.">
            <Button size="sm" className="mt-2" onClick={() => setEditing("new")}>Add product</Button>
          </EmptyState>
        )}
        <ul className="grid gap-4 md:grid-cols-2">
          {data.products.map((p) =>
            editing === p.id ? (
              <li key={p.id} className="md:col-span-2">
                <ProductEditor
                  currency={cur}
                  initial={productForm(p)}
                  onCancel={() => setEditing(null)}
                  onDelete={async () => {
                    if (!confirm(`Delete ${p.name}? Live offers on it end. To keep it but stop selling, switch it off instead.`)) return;
                    if (await run(() => sendJson(`${api}?kind=product&id=${encodeURIComponent(p.id)}`, "DELETE"), "Product deleted.")) setEditing(null);
                  }}
                  onSave={async (f) => (await run(() => sendJson(api, "PATCH", { kind: "product", id: p.id, ...productPayload(f) }), "Product saved.")) && setEditing(null)}
                />
              </li>
            ) : (
              <ProductCard
                key={p.id}
                p={p}
                cur={cur}
                onEdit={() => { setEditing(p.id); setMsg(null); }}
                onActive={(active) => run(() => sendJson(api, "PATCH", { kind: "product", id: p.id, active }), active ? `${p.name} is on sale.` : `${p.name} is hidden from Oja.`)}
              />
            ),
          )}
        </ul>
      </section>

      <section aria-labelledby="zones-h" className="space-y-3 border-t border-line pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Kicker>Delivery</Kicker>
            <h2 id="zones-h" className="mt-1 font-display text-2xl text-strong">Where you deliver</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">Oja quotes delivery cost and arrival time from these zones before the buyer pays. Use * as the country for &quot;everywhere else&quot;. Making time (lead days) is added on top.</p>
          </div>
          <Button variant="outline" onClick={() => setEditingZone("new")} disabled={editingZone === "new"}>Add zone</Button>
        </div>
        {editingZone === "new" && (
          <ZoneEditor
            currency={cur}
            initial={blankZone(data.country)}
            onCancel={() => setEditingZone(null)}
            onSave={async (f) => (await run(() => sendJson(api, "POST", { kind: "zone", ...zonePayload(f) }), "Zone added.")) && setEditingZone(null)}
          />
        )}
        {data.zones.length === 0 && editingZone !== "new" && <p className="border border-dashed border-line-strong p-4 text-sm text-muted">No delivery zones. Oja will tell buyers you don&apos;t deliver to them yet.</p>}
        <ul className="divide-y divide-line border border-line bg-surface">
          {data.zones.map((z) =>
            editingZone === z.id ? (
              <li key={z.id} className="p-2">
                <ZoneEditor
                  currency={cur}
                  initial={zoneForm(z)}
                  onCancel={() => setEditingZone(null)}
                  onDelete={async () => {
                    if (!confirm(`Delete the ${z.country}${z.region ? ` / ${z.region}` : ""} zone?`)) return;
                    if (await run(() => sendJson(`${api}?kind=zone&id=${encodeURIComponent(z.id)}`, "DELETE"), "Zone deleted.")) setEditingZone(null);
                  }}
                  onSave={async (f) => (await run(() => sendJson(api, "PATCH", { kind: "zone", id: z.id, ...zonePayload(f) }), "Zone saved.")) && setEditingZone(null)}
                />
              </li>
            ) : (
              <li key={z.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="w-24 font-mono font-bold text-strong">{z.country === "*" ? "* ELSE" : z.country}{z.region ? <span className="block text-[11px] font-normal text-muted">{z.region}</span> : null}</span>
                <span className="min-w-0 flex-1 text-text">{z.carrier} · {z.etaDaysMin}–{z.etaDaysMax} days</span>
                {z.tracked ? <Tag>Tracked</Tag> : <Tag dashed>Untracked</Tag>}
                <Price size="sm">{format(z.costMinor, cur)}</Price>
                <Button size="sm" variant="ghost" onClick={() => setEditingZone(z.id)} aria-label={`Edit ${z.country} ${z.region ?? ""} zone`}>Edit</Button>
              </li>
            ),
          )}
        </ul>
      </section>
    </main>
  );
}

function productPayload(f: ProductForm) {
  return {
    name: f.name, description: f.description, listPrice: f.listPrice, minPrice: f.minPrice, stock: f.stock.trim(),
    leadTimeDays: f.leadTimeDays.trim(), videoUrl: f.videoUrl.trim(), active: f.active,
    tiers: f.tiers.filter((t) => t.minQty.trim() || t.unitPrice.trim()).map((t) => ({ minQty: t.minQty.trim(), unitPrice: t.unitPrice.trim() })),
  };
}

function zonePayload(f: ZoneForm) {
  return { ...f, country: f.country.trim().toUpperCase(), region: f.region.trim(), carrier: f.carrier.trim() };
}

function ProductCard({ p, cur, onEdit, onActive }: { p: Product; cur: Currency; onEdit: () => void; onActive: (v: boolean) => void }) {
  return (
    <Swatch as="li" pattern={p.active ? "dots" : "stitch"} className={p.active ? "" : "opacity-75"}>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3 pr-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl text-strong">{p.name}</h3>
            {p.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{p.description}</p>}
          </div>
          {!p.active && <Stamp>Hidden</Stamp>}
        </div>
        <dl className="grid grid-cols-2 gap-2 border-y border-dashed border-line-strong py-2">
          <div><dt className="font-mono text-[10px] uppercase tracking-wider text-muted">List</dt><dd><Price>{format(p.listPriceMinor, cur)}</Price></dd></div>
          <div><dt className="font-mono text-[10px] uppercase tracking-wider text-muted">Floor (private)</dt><dd><Price>{format(p.minPriceMinor, cur)}</Price></dd></div>
        </dl>
        <div className="flex flex-wrap gap-1.5">
          {p.stock === null ? <Tag dashed>Made to order</Tag> : <Tag>{p.stock} in stock</Tag>}
          {p.leadTimeDays > 0 && <Tag>{p.leadTimeDays}d making</Tag>}
          {p.tiers.map((t) => <Tag key={t.minQty}>{t.minQty}+ @ {format(t.unitPriceMinor, cur)}</Tag>)}
          {p.videoUrl && <Tag>Video</Tag>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Toggle checked={p.active} onChange={onActive} label={`${p.name} on sale`} />
          <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
        </div>
      </div>
    </Swatch>
  );
}

function ProductEditor({ initial, currency, onSave, onCancel, onDelete }: {
  initial: ProductForm; currency: Currency; onSave: (f: ProductForm) => Promise<unknown>; onCancel: () => void; onDelete?: () => void;
}) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const id = (s: string) => `p-${s}`;
  return (
    <Swatch as="section" pattern="olokun" className="border-dye">
      <form
        className="space-y-4 p-4 sm:p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          await onSave(f);
          setSaving(false);
        }}
      >
        <Kicker>{onDelete ? "Edit product" : "New product"}</Kicker>
        <Field id={id("name")} label="Name" value={f.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} />
        <TextArea id={id("desc")} label="Description" hint="Fabric, size, colours: what buyers ask. Oja answers from this." value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={id("list")} label={`List price (${currency})`} inputMode="decimal" placeholder="25000" value={f.listPrice} onChange={(e) => set("listPrice", e.target.value)} required className="font-mono" />
          <Field id={id("min")} label={`Minimum price (${currency})`} hint="Private. Code-enforced floor: Oja can never go below it." inputMode="decimal" placeholder="20000" value={f.minPrice} onChange={(e) => set("minPrice", e.target.value)} required className="font-mono" />
          <Field id={id("stock")} label="Stock" hint="Leave blank for made to order." inputMode="numeric" value={f.stock} onChange={(e) => set("stock", e.target.value)} className="font-mono" />
          <Field id={id("lead")} label="Lead time (days)" hint="Making time added to delivery ETA." inputMode="numeric" value={f.leadTimeDays} onChange={(e) => set("leadTimeDays", e.target.value)} className="font-mono" />
        </div>

        <fieldset className="space-y-2 border border-dashed border-line-strong p-3">
          <legend className="px-1 font-mono text-[11px] uppercase tracking-wider text-muted">Bulk / aso-ebi tiers</legend>
          <p className="text-xs text-muted">Unit price when a buyer takes at least this many. Must sit between your minimum and list price.</p>
          {f.tiers.map((t, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="w-24 shrink-0"><Field id={id(`tq${i}`)} label="Min qty" inputMode="numeric" value={t.minQty} onChange={(e) => set("tiers", f.tiers.map((x, j) => (j === i ? { ...x, minQty: e.target.value } : x)))} className="font-mono" /></div>
              <div className="min-w-0 flex-1"><Field id={id(`tp${i}`)} label={`Unit price (${currency})`} inputMode="decimal" value={t.unitPrice} onChange={(e) => set("tiers", f.tiers.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))} className="font-mono" /></div>
              <Button type="button" size="md" variant="ghost" aria-label={`Remove tier ${i + 1}`} onClick={() => set("tiers", f.tiers.filter((_, j) => j !== i))}>✕</Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" disabled={f.tiers.length >= 10} onClick={() => set("tiers", [...f.tiers, { minQty: "", unitPrice: "" }])}>Add tier</Button>
        </fieldset>

        <Field id={id("video")} label="Video URL" hint="Optional https link Oja can share (a try-on or fabric close-up)." type="url" placeholder="https://" value={f.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} />
        <div className="flex items-center gap-3">
          <Toggle id={id("active")} checked={f.active} onChange={(v) => set("active", v)} label="On sale" />
          <span className="text-sm text-muted">{f.active ? "On sale: Oja can offer it" : "Hidden: Oja won't offer it"}</span>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button disabled={saving}>{saving ? "Saving…" : "Save product"}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          {onDelete && <Button type="button" variant="ghost" className="ml-auto" onClick={onDelete}>Delete</Button>}
        </div>
      </form>
    </Swatch>
  );
}

function ZoneEditor({ initial, currency, onSave, onCancel, onDelete }: {
  initial: ZoneForm; currency: Currency; onSave: (f: ZoneForm) => Promise<unknown>; onCancel: () => void; onDelete?: () => void;
}) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ZoneForm>(k: K, v: ZoneForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const uid = onDelete ? "ze" : "zn";
  return (
    <form
      className="space-y-4 border border-dye bg-surface p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSave(f);
        setSaving(false);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={`${uid}-country`} label="Country" hint="ISO-2 like NG, GB, US, or *" value={f.country} onChange={(e) => set("country", e.target.value)} maxLength={2} required className="font-mono uppercase" />
        <Field id={`${uid}-region`} label="Region / city" hint="Optional, e.g. Lagos" value={f.region} onChange={(e) => set("region", e.target.value)} maxLength={80} />
        <Field id={`${uid}-carrier`} label="Carrier" value={f.carrier} onChange={(e) => set("carrier", e.target.value)} required maxLength={60} />
        <Field id={`${uid}-cost`} label={`Cost (${currency})`} inputMode="decimal" value={f.cost} onChange={(e) => set("cost", e.target.value)} required className="font-mono" />
        <Field id={`${uid}-min`} label="ETA from (days)" inputMode="numeric" value={f.etaDaysMin} onChange={(e) => set("etaDaysMin", e.target.value)} required className="font-mono" />
        <Field id={`${uid}-max`} label="ETA to (days)" inputMode="numeric" value={f.etaDaysMax} onChange={(e) => set("etaDaysMax", e.target.value)} required className="font-mono" />
      </div>
      <div className="flex items-center gap-3">
        <Toggle id={`${uid}-tracked`} checked={f.tracked} onChange={(v) => set("tracked", v)} label="Tracked delivery" />
        <span className="text-sm text-muted">Tracked: the buyer gets a tracking number (useful evidence if a PayPal dispute comes up)</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={saving}>{saving ? "Saving…" : "Save zone"}</Button>
        <Button size="sm" type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        {onDelete && <Button size="sm" type="button" variant="ghost" className="ml-auto" onClick={onDelete}>Delete</Button>}
      </div>
    </form>
  );
}
