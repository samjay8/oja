"use client";

import { useState } from "react";
import { Button, Field, Kicker, Select, Stamp, Swatch, Tag, TextArea } from "@/components/ui";
import { DeskHeading, FieldError, Loading, Notice, SavedNote, sendJson, useDeskData, useFlash } from "@/components/desk/bits";
import { SignIn } from "@/components/desk/sign-in";
import { LANGUAGE_CODES, LANGUAGES, type LanguageCode } from "@/lib/languages";

type Settings = {
  name: string; slug: string; country: string; currency: string;
  replyMode: "copilot" | "autopilot"; language: LanguageCode; tagline: string | null; salesScript: string | null;
  bankTransferDetails: string | null; paypalVerified: boolean; paypalMerchantEmail: string | null;
  playbook: { maxRounds: number; concession: number; loyaltyDiscount: number; priceStepMinor: number };
  dashboardKeySet: boolean;
};

type Form = {
  replyMode: Settings["replyMode"]; language: LanguageCode; tagline: string; salesScript: string; bankTransferDetails: string;
  maxRounds: string; concessionPct: string; loyaltyPct: string; priceStep: string;
};

const toForm = (s: Settings): Form => ({
  replyMode: s.replyMode, language: s.language, tagline: s.tagline ?? "", salesScript: s.salesScript ?? "",
  bankTransferDetails: s.bankTransferDetails ?? "", maxRounds: String(s.playbook.maxRounds),
  concessionPct: String(Math.round(s.playbook.concession * 100)), loyaltyPct: String(Math.round(s.playbook.loyaltyDiscount * 1000) / 10),
  priceStep: s.playbook.priceStepMinor % 100 ? (s.playbook.priceStepMinor / 100).toFixed(2) : String(s.playbook.priceStepMinor / 100),
});

export function SettingsEditor({ slug }: { slug: string }) {
  const { data, status, reload } = useDeskData<Settings>(`/api/vendor/${slug}/settings`);
  // Lives above the form: the form remounts with fresh data after a save.
  const saved = useFlash();
  if (status === 401) return <SignIn slug={slug} onDone={reload} />;
  if (status !== null && status !== 200 && !data) return <div className="mx-auto w-full max-w-3xl px-4 py-8"><Notice tone="error">Couldn&apos;t load settings ({status || "network error"}). Refresh the page to try again.</Notice></div>;
  if (!data) return <Loading label="Opening your settings…" layout="form" />;
  return <SettingsForm key={JSON.stringify(data)} slug={slug} s={data} saved={saved} onSaved={() => { saved.show("Saved. Oja uses this from the next message."); reload(); }} />;
}

type Errs = Partial<Record<"rounds" | "conc" | "loyal", string>>;
const check = (f: Form): Errs => {
  const e: Errs = {};
  const maxRounds = Number(f.maxRounds), concession = Number(f.concessionPct) / 100, loyalty = Number(f.loyaltyPct) / 100;
  if (!Number.isInteger(maxRounds) || maxRounds < 1 || maxRounds > 6) e.rounds = "Use a whole number from 1 to 6.";
  if (!(concession >= 0.1 && concession <= 0.9)) e.conc = "Use a value between 10% and 90%.";
  if (!(loyalty >= 0 && loyalty <= 0.3)) e.loyal = "Use a value between 0% and 30%.";
  return e;
};

function SettingsForm({ slug, s, saved, onSaved }: { slug: string; s: Settings; saved: ReturnType<typeof useFlash>; onSaved: () => void }) {
  const [f, setF] = useState<Form>(() => toForm(s));
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const errs = tried ? check(f) : {};
  const a11y = (k: keyof Errs) => (errs[k] ? { "aria-invalid": true as const, "aria-describedby": `s-${k}-err` } : {});
  const errMsg = (k: keyof Errs) => (errs[k] ? <FieldError id={`s-${k}-err`}>{errs[k]}</FieldError> : null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const naira = s.currency === "NGN";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    saved.hide();
    setTried(true);
    const first = Object.keys(check(f))[0];
    if (first) {
      document.getElementById(`s-${first}`)?.focus();
      return;
    }
    const maxRounds = Number(f.maxRounds), concession = Number(f.concessionPct) / 100, loyalty = Number(f.loyaltyPct) / 100;
    setSaving(true);
    try {
      await sendJson(`/api/vendor/${slug}/settings`, "PATCH", {
        replyMode: f.replyMode, language: f.language, tagline: f.tagline, salesScript: f.salesScript, bankTransferDetails: f.bankTransferDetails,
        playbook: { maxRounds, concession, loyaltyDiscount: loyalty, priceStep: f.priceStep.trim() },
      });
      onSaved();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "That didn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="fade mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 sm:px-6">
      <DeskHeading kicker={`Settings · ${s.slug}`} title="How Oja sells for you" />
      <form onSubmit={save} noValidate className="space-y-6">
        <Swatch as="section" pattern="grid">
          <div className="space-y-4 p-4 sm:p-5">
            <Kicker>Reply mode</Kicker>
            <div role="radiogroup" aria-label="Reply mode" className="grid gap-3 sm:grid-cols-2">
              {([
                ["copilot", "Copilot", "Oja writes a draft for every buyer message. Nothing reaches the buyer until you tap Send, edit it, or ask for a redraft. Best while you build trust: buyers told us they dislike obvious bot replies.", "Default"],
                ["autopilot", "Autopilot", "Oja replies on its own, day and night. Any reply that mentions a price or link the code didn't produce, or that needs a human, is held for you instead of sent.", "Opt in"],
              ] as const).map(([v, label, body, tag]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={f.replyMode === v}
                  onClick={() => set("replyMode", v)}
                  className={`ease-ui border p-4 text-left ${f.replyMode === v ? "border-dye bg-wash shadow-[3px_3px_0_0_var(--dye)]" : "border-line hover:border-line-strong"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-display text-xl text-strong">{label}</span>
                    {f.replyMode === v ? <Stamp filled tilt={false} className="fade">Selected</Stamp> : <Tag dashed>{tag}</Tag>}
                  </span>
                  <span className="mt-2 block text-sm text-muted">{body}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">Either way, prices and minimums are enforced in code, and you can take over any chat with one tap.</p>
          </div>
        </Swatch>

        <Swatch as="section">
          <div className="space-y-4 p-4 sm:p-5">
            <Kicker>Shop voice</Kicker>
            <Select id="s-lang" label="Language you read" value={f.language} onChange={(e) => set("language", e.target.value as LanguageCode)}>
              {LANGUAGE_CODES.map((c) => <option key={c} value={c}>{LANGUAGES[c].label}{LANGUAGES[c].beta ? " (beta)" : ""}</option>)}
            </Select>
            <p className="-mt-2 text-xs text-muted">The Translate button in your inbox turns buyer messages into this language. Beta languages haven&apos;t been reviewed by a native speaker yet.</p>
            <Field id="s-tagline" label="Tagline" hint="One line on your shop page." value={f.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={140} />
            <TextArea id="s-script" label="Your sales notes" hint="How you like to sell: greetings, what to recommend, what never to promise. Oja follows these, but can't change prices with them." value={f.salesScript} onChange={(e) => set("salesScript", e.target.value)} maxLength={4000} className="min-h-32" />
          </div>
        </Swatch>

        <Swatch as="section" pattern="stitch">
          <div className="space-y-4 p-4 sm:p-5">
            <Kicker>Haggling playbook</Kicker>
            <p className="text-sm text-muted">Code runs the haggle from your list price toward your minimum price. These set how fast it moves.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Field id="s-rounds" label="Counter rounds (1–6)" hint="Counters before Oja holds firm." type="number" min={1} max={6} step={1} value={f.maxRounds} onChange={(e) => set("maxRounds", e.target.value)} className="font-mono" {...a11y("rounds")} />{errMsg("rounds")}</div>
              <div><Field id="s-conc" label="Concession per round (10–90%)" hint="Share of the gap Oja gives up each counter." type="number" min={10} max={90} step={1} value={f.concessionPct} onChange={(e) => set("concessionPct", e.target.value)} className="font-mono" {...a11y("conc")} />{errMsg("conc")}</div>
              <div><Field id="s-loyal" label="Loyalty discount (0–30%)" hint="For buyers with a delivered order. Never below your minimum." type="number" min={0} max={30} step={0.5} value={f.loyaltyPct} onChange={(e) => set("loyaltyPct", e.target.value)} className="font-mono" {...a11y("loyal")} />{errMsg("loyal")}</div>
              <Field id="s-step" label={`Price step (${s.currency})`} hint={`Offers round to this, e.g. ${naira ? "100" : "1"}.`} inputMode="decimal" value={f.priceStep} onChange={(e) => set("priceStep", e.target.value)} className="font-mono" />
            </div>
          </div>
        </Swatch>

        <Swatch as="section">
          <div className="space-y-4 p-4 sm:p-5">
            <Kicker>Getting paid</Kicker>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-strong">PayPal (USD, cross-border)</span>
              {s.paypalVerified ? <Stamp filled tilt={false}>Verified payee</Stamp> : <Tag dashed>Not verified</Tag>}
              {s.paypalMerchantEmail && <span className="font-mono text-xs text-muted">{s.paypalMerchantEmail}</span>}
            </div>
            <TextArea
              id="s-bank"
              label="Bank transfer details (naira)"
              hint="Shown to buyers who pay by transfer. Only you can mark a transfer as received; Oja never does."
              value={f.bankTransferDetails}
              onChange={(e) => set("bankTransferDetails", e.target.value)}
              maxLength={500}
              placeholder={"Bank name\nAccount number\nAccount name"}
            />
          </div>
        </Swatch>

        <Swatch as="section" pattern="dots">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
            <div>
              <Kicker>Dashboard key</Kicker>
              <p className="mt-1 text-sm text-muted">Signs you in to this desk. It&apos;s stored only as a hash and never shown.</p>
            </div>
            {s.dashboardKeySet ? <Stamp filled tilt={false}>Key set</Stamp> : <Tag dashed>Not set</Tag>}
          </div>
        </Swatch>

        {msg && <Notice key={msg} tone="error">{msg}</Notice>}
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t border-line bg-paper px-4 py-3 sm:mx-0 sm:px-0">
          <Button disabled={saving} className="max-sm:h-11">{saving ? "Saving…" : "Save settings"}</Button>
          <Button type="button" variant="ghost" className="max-sm:h-11" disabled={saving} onClick={() => { setF(toForm(s)); setMsg(null); setTried(false); saved.hide(); }}>Reset</Button>
          <SavedNote flash={saved} className="ml-1" />
        </div>
      </form>
    </main>
  );
}
