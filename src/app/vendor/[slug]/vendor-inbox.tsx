"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePoll } from "../../use-poll";
import { Button, CHANNEL_LABEL, ChannelGlyph, Kicker, Price, Stamp, Tag, type ChannelKind } from "@/components/ui";
import { Loading, Notice, Reveal, TAP, useDeskData, useFresh } from "@/components/desk/bits";
import { SignIn } from "@/components/desk/sign-in";
import { LANGUAGES, isLanguage, type LanguageCode } from "@/lib/languages";

type Msg = {
  id: string; role: "buyer" | "agent" | "vendor" | "system"; status: "sent" | "draft" | "discarded"; body: string; createdAt: string;
  translations?: Partial<Record<LanguageCode, string>>;
};
type Conv = {
  id: string; channel: string; buyerRef: string; buyerName: string | null; language?: LanguageCode | null;
  aiPaused: boolean; needsHuman: boolean; lastBuyerMessageAt: string | null; messages: Msg[];
};
type Order = {
  id: string; ref: string; status: string; rail: "paypal" | "bank_transfer"; currency: string; totalMinor: number; shippingMinor: number;
  lines: { name: string; qty: number; unitPriceMinor: number }[]; shipTo: { name: string; line1: string; city: string; country: string };
  carrier: string | null; trackingNumber: string | null; conversationId: string; createdAt: string;
};
type Ev = { id: string; type: string; data: Record<string, unknown>; createdAt: string };
type Inbox = { vendor: { name: string; slug: string; currency: string; replyMode: "copilot" | "autopilot"; paypalVerified: boolean; language?: LanguageCode }; conversations: Conv[]; orders: Order[]; events: Ev[] };
/** Resolves true when the action went through. */
type Act = (b: Record<string, unknown>) => Promise<boolean>;
type IsFresh = (k: string) => boolean;

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);

const STATUS: Record<string, { label: string; filled?: boolean; dashed?: boolean }> = {
  awaiting_payment: { label: "Awaiting payment", dashed: true },
  paid: { label: "Paid", filled: true },
  shipped: { label: "Shipped" },
  delivered: { label: "Delivered" },
  cancelled: { label: "Cancelled", dashed: true },
};

const channelKind = (c: string): ChannelKind => (c in CHANNEL_LABEL ? (c as ChannelKind) : "web");
const buyerLabel = (c: Conv) => c.buyerName ?? `Buyer ${c.buyerRef.slice(-4)}`;
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const lastBuyerId = (c: Conv) => c.messages.findLast((m) => m.role === "buyer" && m.status === "sent")?.id ?? "";
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function freshKeys(d: Inbox) {
  return [
    ...d.conversations.flatMap((c) => c.messages.map((m) => `m:${m.id}`)),
    ...d.orders.flatMap((o) => [`o:${o.id}`, `s:${o.id}:${o.status}`]),
    ...d.events.map((e) => `e:${e.id}`),
  ];
}

export function VendorInbox({ slug }: { slug: string }) {
  const { data, status, reload: load } = usePoll<Inbox>(`/api/vendor/${slug}/inbox`, 4000);
  const settings = useDeskData<{ language: LanguageCode }>(`/api/vendor/${slug}/settings`);
  const signedOut = status === 401;
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMode, setPendingMode] = useState<"copilot" | "autopilot" | null>(null);
  const keys = useMemo(() => (data ? freshKeys(data) : null), [data]);
  const isFresh = useFresh(keys);

  const act: Act = async (body) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/vendor/${slug}/action`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Failed");
      load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const conv = useMemo(() => data?.conversations.find((c) => c.id === selected) ?? data?.conversations[0] ?? null, [data, selected]);

  // Unread: a buyer message that arrived in a chat you weren't looking at. Chats already
  // there on load count as read.
  const [seen, setSeen] = useState<Record<string, string> | null>(null);
  if (data && seen === null) setSeen(Object.fromEntries(data.conversations.map((c) => [c.id, lastBuyerId(c)])));
  if (conv && seen && seen[conv.id] !== lastBuyerId(conv)) setSeen({ ...seen, [conv.id]: lastBuyerId(conv) });

  const liveMode = data?.vendor.replyMode;
  if (pendingMode && pendingMode === liveMode) setPendingMode(null);

  if (signedOut) return <SignIn slug={slug} onDone={() => { load(); settings.reload(); }} />;
  if (!data) return <Loading label="Opening your inbox…" layout="inbox" />;
  const cur = data.vendor.currency;
  const vendorLang: LanguageCode = data.vendor.language ?? settings.data?.language ?? "en";
  const mode = pendingMode ?? data.vendor.replyMode;

  return (
    <main className="fade mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <Kicker>Inbox · {data.conversations.length} {data.conversations.length === 1 ? "chat" : "chats"} · {data.orders.length} {data.orders.length === 1 ? "order" : "orders"}</Kicker>
          <h1 className="mt-1 font-display text-3xl text-strong sm:text-4xl">{data.vendor.name}</h1>
        </div>
        <div role="radiogroup" aria-label="Reply mode" aria-busy={pendingMode !== null} className="relative grid w-full grid-cols-2 border border-dye sm:w-auto">
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-dye transition-transform duration-[var(--dur-3)] ease-[var(--ease-out)] motion-reduce:transition-none ${mode === "autopilot" ? "translate-x-full" : ""}`}
          />
          {(["copilot", "autopilot"] as const).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={mode === m}
              disabled={busy}
              onClick={async () => {
                if (mode === m) return;
                setPendingMode(m);
                if (!(await act({ type: "set_mode", mode: m }))) setPendingMode(null);
              }}
              className={`ease-ui relative px-3 py-2 text-left text-xs disabled:cursor-wait sm:px-4 ${mode === m ? "text-on-dye" : "text-dye hover:bg-wash"}`}
            >
              <span className="block font-mono font-bold uppercase tracking-[0.18em]">{m}</span>
              <span className={`ease-ui block text-[11px] ${mode === m ? "opacity-80" : "text-muted"}`}>
                {m === "copilot" ? "Oja drafts, you tap send" : "Oja replies; risky ones come to you"}
              </span>
            </button>
          ))}
        </div>
      </header>
      {error && <div className="mt-3"><Notice key={error} tone="error">{error}</Notice></div>}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[17rem_minmax(0,1fr)_21rem]">
        <nav className="min-w-0 space-y-2" aria-label="Conversations">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Chats</h2>
          {data.conversations.length === 0 && (
            <p className="adire-dots border border-dashed border-line-strong p-4 text-sm text-muted">
              No chats yet. Share your shop link; new chats appear here on their own.
            </p>
          )}
          <ul className="relative flex gap-2 overflow-x-auto pt-1 pb-1 lg:block lg:pt-0 lg:space-y-2 lg:overflow-visible lg:pb-0">
            {data.conversations.map((c) => {
              const last = c.messages.filter((m) => m.status === "sent").at(-1) ?? c.messages.at(-1);
              const hasDraft = c.messages.some((m) => m.status === "draft");
              const on = conv?.id === c.id;
              const unread = !on && seen !== null && (seen[c.id] ?? "") !== lastBuyerId(c);
              const k = channelKind(c.channel);
              return (
                <li key={c.id} className="w-64 shrink-0 lg:w-auto">
                  <button
                    onClick={() => setSelected(c.id)}
                    aria-current={on ? "true" : undefined}
                    className={`block w-full border p-3 text-left ${on ? "ease-ui border-dye bg-surface shadow-[3px_3px_0_0_var(--dye)]" : "lift border-line bg-surface"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        {unread && <span aria-hidden className="fade size-2 shrink-0 bg-dye" />}
                        <span className={`truncate text-strong ${unread ? "font-bold" : "font-semibold"}`}>{buyerLabel(c)}</span>
                        {unread && <span className="sr-only">(new message)</span>}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-muted" title={CHANNEL_LABEL[k]}>
                        <ChannelGlyph kind={k} className="size-3.5" />
                        <span className="sr-only">{CHANNEL_LABEL[k]}</span>
                      </span>
                    </div>
                    <p key={last?.id} className={`mt-0.5 truncate text-sm ${unread ? "text-text" : "text-muted"} ${last && isFresh(`m:${last.id}`) ? "fade" : ""}`}>{last?.body ?? "…"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {hasDraft && <Stamp tilt={false} filled className="fade">Draft ready</Stamp>}
                      {c.needsHuman && <Stamp tilt={false} className="fade">Needs you</Stamp>}
                      {c.aiPaused && <Tag dashed>AI paused</Tag>}
                      {c.language && isLanguage(c.language) && <Tag>{LANGUAGES[c.language].label}</Tag>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section aria-label="Conversation" className="flex h-[70dvh] min-h-[26rem] min-w-0 flex-col border border-line bg-surface lg:h-[calc(100dvh-14rem)] lg:min-h-[32rem]">
          {conv ? (
            <div key={conv.id} className="fade flex min-h-0 flex-1 flex-col">
              <Thread slug={slug} conv={conv} busy={busy} act={act} vendorLang={vendorLang} isFresh={isFresh} />
            </div>
          ) : (
            <p className="adire-dots flex flex-1 items-center justify-center p-6 text-center text-sm text-muted">Pick a chat to read it here.</p>
          )}
        </section>

        <aside className="min-w-0 space-y-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Orders</h2>
          {data.orders.length === 0 && (
            <p className="border border-dashed border-line-strong p-4 text-sm text-muted">No orders yet. When a buyer checks out, the receipt prints here.</p>
          )}
          {data.orders.map((o) => <OrderCard key={o.id} o={o} cur={cur} busy={busy} act={act} isFresh={isFresh} />)}
          <h2 className="pt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">Audit trail</h2>
          <ol className="border-l border-line-strong pl-3 text-xs text-muted">
            {data.events.slice(0, 12).map((e) => (
              <li key={e.id} className={`relative py-1 before:absolute before:top-2.5 before:-left-[15.5px] before:size-1.5 before:bg-line-strong ${isFresh(`e:${e.id}`) ? "rise" : ""}`}>
                <span className="font-mono text-strong">{e.type}</span> · <time dateTime={e.createdAt}>{time(e.createdAt)}</time>
                {e.type === "guard.held" && Array.isArray(e.data.reasons) && (
                  <span className="block break-words">Held: {e.data.reasons.map(String).join("; ")}</span>
                )}
              </li>
            ))}
            {data.events.length === 0 && <li className="py-1">Nothing yet. Every sale step is recorded here.</li>}
          </ol>
        </aside>
      </div>
    </main>
  );
}

function Thread({ slug, conv, busy, act, vendorLang, isFresh }: { slug: string; conv: Conv; busy: boolean; act: Act; vendorLang: LanguageCode; isFresh: IsFresh }) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [pausing, setPausing] = useState(false);
  const draft = conv.messages.find((m) => m.status === "draft") ?? null;
  // Keep the last draft on screen while its box collapses after send or discard.
  const [lastDraft, setLastDraft] = useState(draft);
  if (draft && draft !== lastDraft) setLastDraft(draft);
  const shownDraft = draft ?? lastDraft;
  const k = channelKind(conv.channel);
  const sent = conv.messages.filter((m) => m.status === "sent");
  const lastId = sent.at(-1)?.id;

  // Follow new messages only when the seller is already at the bottom (or just sent one).
  const listRef = useRef<HTMLOListElement>(null);
  const atBottom = useRef(true);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    const ro = new ResizeObserver(() => { if (atBottom.current) el.scrollTop = el.scrollHeight; });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = listRef.current;
    if (!el || !lastId || !atBottom.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reducedMotion() ? "auto" : "smooth" });
  }, [lastId]);
  const stick = () => { atBottom.current = true; };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-strong">{buyerLabel(conv)}</p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><ChannelGlyph kind={k} className="size-3.5" />{CHANNEL_LABEL[k]}</span>
            {conv.language && isLanguage(conv.language) && <Tag>{LANGUAGES[conv.language].label}</Tag>}
            {conv.aiPaused && <Tag dashed className="fade">You have the chat</Tag>}
          </p>
        </div>
        <Button
          variant={conv.aiPaused ? "solid" : "outline"}
          size="sm"
          className={TAP}
          disabled={busy}
          onClick={async () => {
            setPausing(true);
            await act({ type: "pause_ai", conversationId: conv.id, paused: !conv.aiPaused });
            setPausing(false);
          }}
        >
          {pausing ? "One moment…" : conv.aiPaused ? "Let Oja help again" : "Take over (pause AI)"}
        </Button>
      </div>
      <ol
        ref={listRef}
        onScroll={(e) => { const el = e.currentTarget; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96; }}
        className="adire-dots min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4"
        aria-label="Messages"
      >
        {sent.length === 0 && <li className="py-6 text-center text-sm text-muted">No messages in this chat yet.</li>}
        {sent.map((m) => (
          <MessageRow key={m.id} m={m} slug={slug} vendorLang={vendorLang} fresh={isFresh(`m:${m.id}`)} />
        ))}
      </ol>
      <Reveal open={draft !== null}>
        {shownDraft && <DraftBox key={shownDraft.id} draft={shownDraft} conv={conv} busy={busy} act={act} onSend={stick} />}
      </Reveal>
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!reply.trim()) return;
          setSending(true);
          stick();
          if (await act({ type: "send", conversationId: conv.id, body: reply })) setReply("");
          setSending(false);
        }}
      >
        <label htmlFor="vendor-reply" className="sr-only">Reply as yourself</label>
        <input
          id="vendor-reply"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply as yourself"
          className="ease-ui min-w-0 flex-1 border border-line bg-paper px-3 py-2 text-sm text-strong outline-none placeholder:text-muted focus:border-dye max-sm:min-h-11"
        />
        <Button className="max-sm:h-11" disabled={busy || !reply.trim()}>{sending ? "Sending…" : "Send"}</Button>
      </form>
    </>
  );
}

const WHO: Record<Msg["role"], string> = { agent: "Oja (AI)", vendor: "You", system: "System", buyer: "Buyer" };

function MessageRow({ m, slug, vendorLang, fresh }: { m: Msg; slug: string; vendorLang: LanguageCode; fresh: boolean }) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const cached = m.translations?.[vendorLang];
  const shown = translated ?? cached ?? null;
  const buyer = m.role === "buyer";

  async function translate() {
    setState("busy");
    setErr(null);
    try {
      const res = await fetch(`/api/vendor/${slug}/translate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: m.id, to: vendorLang }) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || typeof out.text !== "string") throw new Error(out.error ?? (res.status === 404 ? "Translation isn't available yet" : "Translation failed"));
      setTranslated(out.text);
      setState("idle");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Translation failed");
      setState("error");
    }
  }

  if (m.role === "system") {
    return (
      <li className={`flex justify-center ${fresh ? "fade" : ""}`}>
        <p className="max-w-[90%] whitespace-pre-wrap border border-dashed border-line-strong bg-surface px-3 py-1.5 text-center font-mono text-[11px] text-muted">{m.body}</p>
      </li>
    );
  }
  return (
    <li className={`flex ${buyer ? "justify-start" : "justify-end"} ${fresh ? "rise" : ""}`}>
      <div className={`max-w-[88%] px-3.5 py-2 text-sm ${buyer ? "border border-line bg-surface text-strong" : m.role === "vendor" ? "bg-dye text-on-dye" : "border border-dye bg-wash text-strong"} ${fresh && buyer ? "ink-new" : ""}`}>
        <p className={`mb-0.5 font-mono text-[10px] uppercase tracking-wider ${m.role === "vendor" ? "opacity-75" : "text-muted"}`}>
          {WHO[m.role]} · <time dateTime={m.createdAt}>{time(m.createdAt)}</time>
        </p>
        <p className="whitespace-pre-wrap">{m.body}</p>
        {buyer && (
          <Reveal open={shown !== null}>
            <div className="mt-2 border-t border-dashed border-line-strong pt-1.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{LANGUAGES[vendorLang].label} · machine translation</p>
              <p className="whitespace-pre-wrap text-text">{shown}</p>
            </div>
          </Reveal>
        )}
        {buyer && !shown && (
          <button
            type="button"
            onClick={translate}
            disabled={state === "busy"}
            aria-busy={state === "busy"}
            className="ease-ui mt-1.5 inline-flex items-center font-mono text-[10px] uppercase tracking-wider text-dye underline decoration-dotted underline-offset-4 hover:decoration-solid disabled:cursor-wait disabled:opacity-60 max-sm:min-h-11"
          >
            {state === "busy" ? "Translating…" : state === "error" ? "Try translating again" : `Translate to ${LANGUAGES[vendorLang].label}`}
          </button>
        )}
        {err && <p key={err} role="alert" className="rise mt-1 text-xs font-semibold text-strong">{err}</p>}
      </div>
    </li>
  );
}

function DraftBox({ draft, conv, busy, act, onSend }: { draft: Msg; conv: Conv; busy: boolean; act: Act; onSend: () => void }) {
  const [edit, setEdit] = useState<string | null>(null);
  const [doing, setDoing] = useState<"send" | "redraft" | "discard" | null>(null);
  // After success the box collapses when the next poll lands; this is only a fallback.
  useEffect(() => {
    if (!doing) return;
    const t = setTimeout(() => setDoing(null), 8000);
    return () => clearTimeout(t);
  }, [doing]);

  const run = async (what: "send" | "redraft" | "discard", body: Record<string, unknown>) => {
    setDoing(what);
    if (what === "send") onSend();
    if (!(await act(body))) setDoing(null);
  };
  const locked = busy || doing !== null;

  return (
    <div className="fade border-t-2 border-dye bg-wash p-4" aria-busy={doing !== null}>
      <div className="flex flex-wrap items-center gap-2">
        <Stamp filled>Oja&apos;s draft</Stamp>
        {conv.needsHuman && <Stamp>Flagged for your review</Stamp>}
      </div>
      {edit === null ? (
        <p className={`ease-ui mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap border-l-2 border-dye pl-3 text-sm text-strong ${doing ? "opacity-60" : ""}`}>{draft.body}</p>
      ) : (
        <>
          <label htmlFor={`edit-${draft.id}`} className="sr-only">Edit draft</label>
          <textarea id={`edit-${draft.id}`} value={edit} onChange={(e) => setEdit(e.target.value)} rows={4} className="rise ease-ui mt-2 w-full border border-line bg-surface p-2 text-sm text-strong outline-none focus:border-dye" />
        </>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" className={TAP} disabled={locked || (edit !== null && !edit.trim())} onClick={() => run("send", { type: "approve_draft", messageId: draft.id, ...(edit !== null ? { body: edit } : {}) })}>
          {doing === "send" ? "Sending…" : edit === null ? "Send" : "Send edited"}
        </Button>
        {edit === null && <Button size="sm" variant="outline" className={TAP} disabled={locked} onClick={() => setEdit(draft.body)}>Edit</Button>}
        <Button size="sm" variant="outline" className={TAP} disabled={locked} onClick={() => run("redraft", { type: "redraft", conversationId: conv.id })}>
          {doing === "redraft" ? "Redrafting…" : "Redraft"}
        </Button>
        <Button size="sm" variant="ghost" className={TAP} disabled={locked} onClick={() => run("discard", { type: "discard_draft", messageId: draft.id })}>
          {doing === "discard" ? "Discarding…" : "Discard"}
        </Button>
      </div>
    </div>
  );
}

function OrderCard({ o, cur, busy, act, isFresh }: { o: Order; cur: string; busy: boolean; act: Act; isFresh: IsFresh }) {
  const [tn, setTn] = useState("");
  const [doing, setDoing] = useState<"ship" | "confirm" | null>(null);
  const s = STATUS[o.status] ?? { label: o.status };
  const c = o.currency || cur;
  const isNew = isFresh(`o:${o.id}`);
  const changed = !isNew && isFresh(`s:${o.id}:${o.status}`);
  const run = async (what: "ship" | "confirm", body: Record<string, unknown>) => {
    setDoing(what);
    await act(body);
    setDoing(null);
  };
  return (
    <article className={`receipt-edge bg-surface ${isNew ? "print-in" : ""}`} aria-label={`Order ${o.ref}`}>
      <div key={o.status} className={`border border-b-0 border-line p-3 pb-4 text-sm ${changed ? "ink-new" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-xs font-bold tracking-wider text-strong">{o.ref}</p>
            <p className="font-mono text-[10px] text-muted">{new Date(o.createdAt).toLocaleDateString()} · {o.rail === "paypal" ? "PayPal" : "Bank transfer"}</p>
          </div>
          {s.dashed ? (
            <span className={`inline-block -rotate-2 border-2 border-dashed border-dye px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase leading-none tracking-[0.18em] text-dye ${changed ? "fade" : ""}`}>{s.label}</span>
          ) : (
            <Stamp filled={s.filled} className={changed ? "fade" : undefined}>{s.label}</Stamp>
          )}
        </div>
        <ul className="mt-3 space-y-1 border-y border-dashed border-line-strong py-2 font-mono text-xs">
          {o.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="min-w-0 truncate text-text">{l.qty} × {l.name}</span>
              <span className="shrink-0 text-strong">{money(l.unitPriceMinor * l.qty, c)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-2 text-muted"><span>Delivery{o.carrier ? ` · ${o.carrier}` : ""}</span><span>{money(o.shippingMinor, c)}</span></li>
        </ul>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Total</span>
          <Price>{money(o.totalMinor, c)}</Price>
        </div>
        <p className="mt-1 text-xs text-muted">Ship to {o.shipTo.name}, {o.shipTo.city}, {o.shipTo.country}</p>
        {o.status === "awaiting_payment" && o.rail === "bank_transfer" && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-muted">Only you can confirm a bank transfer. Check your bank app first.</p>
            <Button size="sm" variant="outline" className={TAP} disabled={busy} onClick={() => run("confirm", { type: "confirm_transfer", orderId: o.id })}>
              {doing === "confirm" ? "Confirming…" : "I've received the transfer"}
            </Button>
          </div>
        )}
        {o.status === "paid" && (
          <form className="mt-3 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); run("ship", { type: "ship", orderId: o.id, trackingNumber: tn }); }}>
            <label htmlFor={`tn-${o.id}`} className="sr-only">Tracking number</label>
            <input id={`tn-${o.id}`} value={tn} onChange={(e) => setTn(e.target.value)} placeholder="Tracking number" className="ease-ui min-w-0 flex-1 border border-line bg-paper px-2 font-mono text-xs text-strong outline-none placeholder:text-muted focus:border-dye max-sm:min-h-11" />
            <Button size="sm" className={TAP} disabled={busy || tn.length < 4}>{doing === "ship" ? "Saving…" : "Mark shipped"}</Button>
          </form>
        )}
        {o.trackingNumber && <p className="mt-2 font-mono text-[11px] text-muted">Tracking {o.trackingNumber}{o.rail === "paypal" ? " · added to PayPal" : ""}</p>}
      </div>
    </article>
  );
}
