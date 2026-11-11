"use client";

import { useEffect, useState } from "react";
import { Button, EmptyState, Field, Kicker, Price, Stamp, Swatch, Tag, TextArea } from "@/components/ui";
import { ConfirmButton, DeskHeading, FieldError, Loading, Notice, Reveal, sendJson, TAP, Toast, Toggle, useDeskData, useFlash } from "@/components/desk/bits";
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
  const [settled, setSettled] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flash = useFlash();
  const api = `/api/vendor/${slug}/catalog`;

  if (status === 401) return <SignIn slug={slug} onDone={reload} />;
  if (status !== null && status !== 200 && !data) return <div className="mx-auto w-full max-w-5xl px-4 py-8"><Notice tone="error">Couldn&apos;t load the catalog ({status || "network error"}). Refresh the page to try again.</Notice></div>;
  if (!data) return <Loading label="Opening your catalog…" />;
  const cur = data.currency;

  /** Runs a request; confirms success with a toast and returns the error text, if any. */
  async function run(fn: () => Promise<unknown>, ok: string): Promise<string | null> {
    setError(null);
    try {
      await fn();
      flash.show(ok);
      reload();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "That didn't save. Please try again.";
    }
  }
  const closeProduct = (id: string | null) => { setEditing(null); setSettled(id); };
  const closeZone = (id: string | null) => { setEditingZone(null); setSettled(id); };

  return (
    <main className="fade mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-6 sm:px-6">
      <DeskHeading kicker={`Catalog · prices in ${cur}`} title="What Oja can sell">
        <Button onClick={() => { setEditing("new"); setError(null); }} disabled={editing === "new"} className="max-sm:h-11">Add product</Button>
      </DeskHeading>

      <Notice>
        Oja quotes only what&apos;s here. It opens at the list price and can haggle down, but code stops it at your minimum price: the AI can never go below it, and buyers never see it.
      </Notice>
      {error && <Notice key={error} tone="error">{error}</Notice>}

      <Reveal open={editing === "new"}>
        <ProductEditor
          currency={cur}
          initial={blankProduct}
          onCancel={() => closeProduct(null)}
          onSave={async (f) => {
            const err = await run(() => sendJson(api, "POST", { kind: "product", ...productPayload(f) }), `${f.name.trim()} added.`);
            if (!err) closeProduct(null);
            return err;
          }}
        />
      </Reveal>

      <section aria-label="Products" className="space-y-3">
        {data.products.length === 0 && editing !== "new" && (
          <EmptyState title="No products yet" body="Add your first item with a list price and the lowest price you'll accept. Oja takes it from there.">
            <Button size="sm" className={`mt-2 ${TAP}`} onClick={() => setEditing("new")}>Add product</Button>
          </EmptyState>
        )}
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.products.map((p) =>
            editing === p.id ? (
              <li key={p.id} className="md:col-span-2">
                <Reveal open appear>
                  <ProductEditor
                    currency={cur}
                    initial={productForm(p)}
                    onCancel={() => closeProduct(p.id)}
                    deleteName={p.name}
                    onDelete={async () => {
                      const err = await run(() => sendJson(`${api}?kind=product&id=${encodeURIComponent(p.id)}`, "DELETE"), `${p.name} deleted.`);
                      if (!err) closeProduct(null);
                      return err;
                    }}
                    onSave={async (f) => {
                      const err = await run(() => sendJson(api, "PATCH", { kind: "product", id: p.id, ...productPayload(f) }), `${f.name.trim()} saved.`);
                      if (!err) closeProduct(p.id);
                      return err;
                    }}
                  />
                </Reveal>
              </li>
            ) : (
              <ProductCard
                key={p.id}
                p={p}
                cur={cur}
                settled={settled === p.id}
                onEdit={() => { setEditing(p.id); setError(null); }}
                onActive={async (active) => {
                  const err = await run(() => sendJson(api, "PATCH", { kind: "product", id: p.id, active }), active ? `${p.name} is on sale.` : `${p.name} is hidden from Oja.`);
                  if (err) setError(err);
                }}
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
          <Button variant="outline" className="max-sm:h-11" onClick={() => setEditingZone("new")} disabled={editingZone === "new"}>Add zone</Button>
        </div>
        <Reveal open={editingZone === "new"}>
          <ZoneEditor
            currency={cur}
            initial={blankZone(data.country)}
            onCancel={() => closeZone(null)}
            onSave={async (f) => {
              const err = await run(() => sendJson(api, "POST", { kind: "zone", ...zonePayload(f) }), "Delivery zone added.");
              if (!err) closeZone(null);
              return err;
            }}
          />
        </Reveal>
        {data.zones.length === 0 && editingZone !== "new" && <p className="adire-dots border border-dashed border-line-strong p-4 text-sm text-muted">No delivery zones yet. Until you add one, Oja tells buyers you don&apos;t deliver to them yet.</p>}
        {data.zones.length > 0 && (
          <ul className="divide-y divide-line border border-line bg-surface">
            {data.zones.map((z) =>
              editingZone === z.id ? (
                <li key={z.id} className="p-2">
                  <Reveal open appear>
                    <ZoneEditor
                      currency={cur}
                      initial={zoneForm(z)}
                      onCancel={() => closeZone(z.id)}
                      deleteName={`the ${z.country}${z.region ? ` / ${z.region}` : ""} zone`}
                      onDelete={async () => {
                        const err = await run(() => sendJson(`${api}?kind=zone&id=${encodeURIComponent(z.id)}`, "DELETE"), "Delivery zone deleted.");
                        if (!err) closeZone(null);
                        return err;
                      }}
                      onSave={async (f) => {
                        const err = await run(() => sendJson(api, "PATCH", { kind: "zone", id: z.id, ...zonePayload(f) }), "Delivery zone saved.");
                        if (!err) closeZone(z.id);
                        return err;
                      }}
                    />
                  </Reveal>
                </li>
              ) : (
                <li key={z.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm ${settled === z.id ? "fade" : ""}`}>
                  <span className="w-24 font-mono font-bold text-strong">{z.country === "*" ? "* ELSE" : z.country}{z.region ? <span className="block text-[11px] font-normal text-muted">{z.region}</span> : null}</span>
                  <span className="min-w-0 flex-1 text-text">{z.carrier} · {z.etaDaysMin}–{z.etaDaysMax} days</span>
                  {z.tracked ? <Tag>Tracked</Tag> : <Tag dashed>Untracked</Tag>}
                  <Price size="sm">{format(z.costMinor, cur)}</Price>
                  <Button size="sm" variant="ghost" className={TAP} onClick={() => setEditingZone(z.id)} aria-label={`Edit ${z.country} ${z.region ?? ""} zone`}>Edit</Button>
                </li>
              ),
            )}
          </ul>
        )}
      </section>
      <Toast flash={flash} />
    </main>
  );
}

const PRICE = /^\d{1,12}(\.\d{1,2})?$/;
const clean = (s: string) => s.trim().replace(/,/g, "");
const whole = (s: string) => /^\d+$/.test(s.trim());

function checkProduct(f: ProductForm) {
  const e: Record<string, string> = {};
  const list = clean(f.listPrice), min = clean(f.minPrice);
  if (!f.name.trim()) e.name = "Give the product a name buyers will recognise.";
  if (!PRICE.test(list)) e.list = "Use a number like 25000 or 12.50.";
  if (!PRICE.test(min)) e.min = "Use a number like 20000 or 12.50.";
  else if (!e.list && Number(min) > Number(list)) e.min = "Your minimum can't be above the list price.";
  if (f.stock.trim() && !whole(f.stock)) e.stock = "Use a whole number, or leave it blank for made to order.";
  if (f.leadTimeDays.trim() && !whole(f.leadTimeDays)) e.lead = "Use a whole number of days.";
  f.tiers.forEach((t, i) => {
    if (!t.minQty.trim() && !t.unitPrice.trim()) return;
    if (!whole(t.minQty) || Number(t.minQty) < 2) e[`tq${i}`] = "At least 2.";
    const u = clean(t.unitPrice);
    if (!PRICE.test(u)) e[`tp${i}`] = "Use a number like 18000.";
    else if (!e.min && !e.list && (Number(u) < Number(min) || Number(u) > Number(list))) e[`tp${i}`] = "Keep it between your minimum and list price.";
  });
  if (f.videoUrl.trim() && !/^https:\/\//i.test(f.videoUrl.trim())) e.video = "Use a full link starting with https://";
  return e;
}

function checkZone(f: ZoneForm) {
  const e: Record<string, string> = {};
  if (!/^([A-Za-z]{2}|\*)$/.test(f.country.trim())) e.country = "Two letters like NG, or * for everywhere else.";
  if (!f.carrier.trim()) e.carrier = "Who delivers? For example GIG or DHL.";
  if (!PRICE.test(clean(f.cost))) e.cost = "Use a number like 3500.";
  if (!whole(f.etaDaysMin)) e.min = "Whole days.";
  if (!whole(f.etaDaysMax)) e.max = "Whole days.";
  else if (!e.min && Number(f.etaDaysMax) < Number(f.etaDaysMin)) e.max = "Can't be sooner than the earliest day.";
  return e;
}

/** Validation shown after the first save attempt, then live as the seller fixes it. */
function useChecks<F>(f: F, check: (f: F) => Record<string, string>, prefix: string) {
  const [tried, setTried] = useState(false);
  const errs = tried ? check(f) : {};
  const a11y = (k: string) => (errs[k] ? { "aria-invalid": true as const, "aria-describedby": `${prefix}-${k}-err` } : {});
  const msg = (k: string) => (errs[k] ? <FieldError id={`${prefix}-${k}-err`}>{errs[k]}</FieldError> : null);
  /** False when the form has errors; focuses the first one. */
  const ok = () => {
    setTried(true);
    const first = Object.keys(check(f))[0];
    if (!first) return true;
    document.getElementById(`${prefix}-${first}`)?.focus();
    return false;
  };
  return { a11y, msg, ok };
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

function ProductCard({ p, cur, settled, onEdit, onActive }: { p: Product; cur: Currency; settled: boolean; onEdit: () => void; onActive: (v: boolean) => void }) {
  return (
    <Swatch as="li" pattern={p.active ? "dots" : "stitch"} className={`ease-ui ${p.active ? "" : "opacity-75"} ${settled ? "fade" : ""}`}>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3 pr-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl text-strong">{p.name}</h3>
            {p.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{p.description}</p>}
          </div>
          {!p.active && <Stamp className="fade">Hidden</Stamp>}
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
          <Button size="sm" variant="outline" className={TAP} onClick={onEdit}>Edit</Button>
        </div>
      </div>
    </Swatch>
  );
}

function ProductEditor({ initial, currency, onSave, onCancel, onDelete, deleteName }: {
  initial: ProductForm; currency: Currency; onSave: (f: ProductForm) => Promise<string | null>; onCancel: () => void;
  onDelete?: () => Promise<string | null>; deleteName?: string;
}) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setF((x) => ({ ...x, [k]: v }));
  // New and edit editors can be open together, so their ids differ.
  const prefix = onDelete ? "pe" : "pn";
  const id = (s: string) => `${prefix}-${s}`;
  const v = useChecks(f, checkProduct, prefix);
  useEffect(() => {
    document.getElementById(`${prefix}-name`)?.focus();
  }, [prefix]);
  return (
    <Swatch as="section" pattern="olokun" className="border-dye">
      <form
        noValidate
        className="space-y-4 p-4 sm:p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          if (!v.ok()) return;
          setSaving(true);
          const out = await onSave(f);
          setSaving(false);
          setErr(out);
        }}
      >
        <Kicker>{onDelete ? "Edit product" : "New product"}</Kicker>
        <div>
          <Field id={id("name")} label="Name" value={f.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} {...v.a11y("name")} />
          {v.msg("name")}
        </div>
        <TextArea id={id("desc")} label="Description" hint="Fabric, size, colours: what buyers ask. Oja answers from this." value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Field id={id("list")} label={`List price (${currency})`} inputMode="decimal" placeholder="25000" value={f.listPrice} onChange={(e) => set("listPrice", e.target.value)} required className="font-mono" {...v.a11y("list")} />
            {v.msg("list")}
          </div>
          <div>
            <Field id={id("min")} label={`Minimum price (${currency})`} hint="Private. Code-enforced floor: Oja can never go below it." inputMode="decimal" placeholder="20000" value={f.minPrice} onChange={(e) => set("minPrice", e.target.value)} required className="font-mono" {...v.a11y("min")} />
            {v.msg("min")}
          </div>
          <div>
            <Field id={id("stock")} label="Stock" hint="Leave blank for made to order." inputMode="numeric" value={f.stock} onChange={(e) => set("stock", e.target.value)} className="font-mono" {...v.a11y("stock")} />
            {v.msg("stock")}
          </div>
          <div>
            <Field id={id("lead")} label="Lead time (days)" hint="Making time added to delivery ETA." inputMode="numeric" value={f.leadTimeDays} onChange={(e) => set("leadTimeDays", e.target.value)} className="font-mono" {...v.a11y("lead")} />
            {v.msg("lead")}
          </div>
        </div>

        <fieldset className="space-y-2 border border-dashed border-line-strong p-3">
          <legend className="px-1 font-mono text-[11px] uppercase tracking-wider text-muted">Bulk / aso-ebi tiers</legend>
          <p className="text-xs text-muted">Unit price when a buyer takes at least this many. Must sit between your minimum and list price.</p>
          {f.tiers.map((t, i) => (
            <div key={i} className="rise flex items-start gap-2">
              <div className="w-24 shrink-0">
                <Field id={id(`tq${i}`)} label="Min qty" inputMode="numeric" value={t.minQty} onChange={(e) => set("tiers", f.tiers.map((x, j) => (j === i ? { ...x, minQty: e.target.value } : x)))} className="font-mono" {...v.a11y(`tq${i}`)} />
                {v.msg(`tq${i}`)}
              </div>
              <div className="min-w-0 flex-1">
                <Field id={id(`tp${i}`)} label={`Unit price (${currency})`} inputMode="decimal" value={t.unitPrice} onChange={(e) => set("tiers", f.tiers.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))} className="font-mono" {...v.a11y(`tp${i}`)} />
                {v.msg(`tp${i}`)}
              </div>
              <Button type="button" size="md" variant="ghost" className="mt-5 max-sm:h-11" aria-label={`Remove tier ${i + 1}`} onClick={() => set("tiers", f.tiers.filter((_, j) => j !== i))}>✕</Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" className={TAP} disabled={f.tiers.length >= 10} onClick={() => set("tiers", [...f.tiers, { minQty: "", unitPrice: "" }])}>Add tier</Button>
        </fieldset>

        <div>
          <Field id={id("video")} label="Video URL" hint="Optional https link Oja can share (a try-on or fabric close-up)." type="url" placeholder="https://" value={f.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} {...v.a11y("video")} />
          {v.msg("video")}
        </div>
        <div className="flex items-center gap-3">
          <Toggle id={id("active")} checked={f.active} onChange={(x) => set("active", x)} label="On sale" />
          <span className="text-sm text-muted">{f.active ? "On sale: Oja can offer it" : "Hidden: Oja won't offer it"}</span>
        </div>
        {err && <Notice key={err} tone="error">{err}</Notice>}
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Button disabled={saving} className="max-sm:h-11">{saving ? "Saving…" : "Save product"}</Button>
          <Button type="button" variant="outline" className="max-sm:h-11" disabled={saving} onClick={onCancel}>Cancel</Button>
          {onDelete && (
            <ConfirmButton
              size="md"
              className="ml-auto max-sm:h-11"
              label="Delete"
              prompt={`Delete ${deleteName ?? "this product"}? Live offers on it end. To keep it, switch it off instead.`}
              confirmLabel="Yes, delete"
              busyLabel="Deleting…"
              disabled={saving}
              onConfirm={async () => setErr(await onDelete())}
            />
          )}
        </div>
      </form>
    </Swatch>
  );
}

function ZoneEditor({ initial, currency, onSave, onCancel, onDelete, deleteName }: {
  initial: ZoneForm; currency: Currency; onSave: (f: ZoneForm) => Promise<string | null>; onCancel: () => void;
  onDelete?: () => Promise<string | null>; deleteName?: string;
}) {
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof ZoneForm>(k: K, v: ZoneForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const uid = onDelete ? "ze" : "zn";
  const v = useChecks(f, checkZone, uid);
  return (
    <form
      noValidate
      className="space-y-4 border border-dye bg-surface p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        if (!v.ok()) return;
        setSaving(true);
        const out = await onSave(f);
        setSaving(false);
        setErr(out);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Field id={`${uid}-country`} label="Country" hint="ISO-2 like NG, GB, US, or *" value={f.country} onChange={(e) => set("country", e.target.value)} maxLength={2} required className="font-mono uppercase" {...v.a11y("country")} />
          {v.msg("country")}
        </div>
        <Field id={`${uid}-region`} label="Region / city" hint="Optional, e.g. Lagos" value={f.region} onChange={(e) => set("region", e.target.value)} maxLength={80} />
        <div>
          <Field id={`${uid}-carrier`} label="Carrier" value={f.carrier} onChange={(e) => set("carrier", e.target.value)} required maxLength={60} {...v.a11y("carrier")} />
          {v.msg("carrier")}
        </div>
        <div>
          <Field id={`${uid}-cost`} label={`Cost (${currency})`} inputMode="decimal" value={f.cost} onChange={(e) => set("cost", e.target.value)} required className="font-mono" {...v.a11y("cost")} />
          {v.msg("cost")}
        </div>
        <div>
          <Field id={`${uid}-min`} label="ETA from (days)" inputMode="numeric" value={f.etaDaysMin} onChange={(e) => set("etaDaysMin", e.target.value)} required className="font-mono" {...v.a11y("min")} />
          {v.msg("min")}
        </div>
        <div>
          <Field id={`${uid}-max`} label="ETA to (days)" inputMode="numeric" value={f.etaDaysMax} onChange={(e) => set("etaDaysMax", e.target.value)} required className="font-mono" {...v.a11y("max")} />
          {v.msg("max")}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Toggle id={`${uid}-tracked`} checked={f.tracked} onChange={(x) => set("tracked", x)} label="Tracked delivery" />
        <span className="text-sm text-muted">Tracked: the buyer gets a tracking number (useful evidence if a PayPal dispute comes up)</span>
      </div>
      {err && <Notice key={err} tone="error">{err}</Notice>}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className={TAP} disabled={saving}>{saving ? "Saving…" : "Save zone"}</Button>
        <Button size="sm" type="button" variant="outline" className={TAP} disabled={saving} onClick={onCancel}>Cancel</Button>
        {onDelete && (
          <ConfirmButton
            className="ml-auto"
            label="Delete"
            prompt={`Delete ${deleteName ?? "this zone"}?`}
            confirmLabel="Yes, delete"
            busyLabel="Deleting…"
            disabled={saving}
            onConfirm={async () => setErr(await onDelete())}
          />
        )}
      </div>
    </form>
  );
}
