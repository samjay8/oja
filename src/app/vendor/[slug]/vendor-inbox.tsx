"use client";

import { useMemo, useState } from "react";
import { usePoll } from "../../use-poll";

type Msg = { id: string; role: "buyer" | "agent" | "vendor" | "system"; status: "sent" | "draft" | "discarded"; body: string; createdAt: string };
type Conv = { id: string; channel: string; buyerRef: string; buyerName: string | null; aiPaused: boolean; needsHuman: boolean; lastBuyerMessageAt: string | null; messages: Msg[] };
type Order = {
  id: string; ref: string; status: string; rail: "paypal" | "bank_transfer"; currency: string; totalMinor: number; shippingMinor: number;
  lines: { name: string; qty: number; unitPriceMinor: number }[]; shipTo: { name: string; line1: string; city: string; country: string };
  carrier: string | null; trackingNumber: string | null; conversationId: string; createdAt: string;
};
type Ev = { id: string; type: string; data: Record<string, unknown>; createdAt: string };
type Inbox = { vendor: { name: string; slug: string; currency: string; replyMode: "copilot" | "autopilot"; paypalVerified: boolean }; conversations: Conv[]; orders: Order[]; events: Ev[] };

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 2 }).format(minor / 100);

const STATUS: Record<string, string> = {
  awaiting_payment: "Awaiting payment", paid: "Paid · ship it", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};

export function VendorInbox({ slug }: { slug: string }) {
  const { data, status, reload: load } = usePoll<Inbox>(`/api/vendor/${slug}/inbox`, 4000);
  const signedOut = status === 401;
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/vendor/${slug}/action`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Failed");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const conv = useMemo(() => data?.conversations.find((c) => c.id === selected) ?? data?.conversations[0] ?? null, [data, selected]);

  if (signedOut) return <SignIn slug={slug} onDone={load} />;
  if (!data) return <p className="p-8 text-muted">Loading inbox…</p>;
  const cur = data.vendor.currency;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ochre">Seller inbox</p>
          <h1 className="font-display text-3xl">{data.vendor.name}</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface p-1 text-sm">
          {(["copilot", "autopilot"] as const).map((m) => (
            <button
              key={m}
              disabled={busy}
              onClick={() => act({ type: "set_mode", mode: m })}
              className={`rounded-full px-4 py-1.5 font-semibold ${data.vendor.replyMode === m ? "bg-indigo text-surface" : "text-muted"}`}
              title={m === "copilot" ? "Oja drafts, you tap send" : "Oja replies on its own; anything risky still comes to you"}
            >
              {m === "copilot" ? "Copilot: I approve replies" : "Autopilot"}
            </button>
          ))}
        </div>
      </header>
      {error && <p className="mt-3 rounded-lg bg-ochre-soft px-3 py-2 text-sm text-warn">{error}</p>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[18rem_1fr_22rem]">
        <nav className="space-y-2" aria-label="Conversations">
          {data.conversations.length === 0 && <p className="text-sm text-muted">No chats yet. Open your shop link and say hi.</p>}
          {data.conversations.map((c) => {
            const last = c.messages.at(-1);
            const hasDraft = c.messages.some((m) => m.status === "draft");
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`block w-full rounded-xl border p-3 text-left ${conv?.id === c.id ? "border-indigo bg-surface" : "border-line bg-surface/60"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{c.buyerName ?? `Buyer ${c.buyerRef.slice(-4)}`}</span>
                  <span className="text-xs uppercase text-muted">{c.channel}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">{last?.body}</p>
                <div className="mt-1 flex gap-1.5">
                  {hasDraft && <Tag tone="indigo">Draft ready</Tag>}
                  {c.needsHuman && <Tag tone="ochre">Needs you</Tag>}
                  {c.aiPaused && <Tag tone="muted">AI paused</Tag>}
                </div>
              </button>
            );
          })}
        </nav>

        <section className="flex min-h-[60vh] flex-col rounded-2xl border border-line bg-surface">
          {conv ? <Thread conv={conv} busy={busy} act={act} /> : <p className="p-6 text-muted">Select a chat.</p>}
        </section>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">Orders</h2>
          {data.orders.length === 0 && <p className="text-sm text-muted">No orders yet.</p>}
          {data.orders.map((o) => <OrderCard key={o.id} o={o} cur={cur} busy={busy} act={act} />)}
          <h2 className="pt-3 text-sm font-semibold uppercase tracking-widest text-muted">Audit trail</h2>
          <ul className="space-y-1 text-xs text-muted">
            {data.events.slice(0, 12).map((e) => (
              <li key={e.id}><span className="font-mono">{e.type}</span> · {new Date(e.createdAt).toLocaleTimeString()}</li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}

function Tag({ tone, children }: { tone: "indigo" | "ochre" | "muted"; children: React.ReactNode }) {
  const cls = tone === "indigo" ? "bg-indigo-soft text-indigo" : tone === "ochre" ? "bg-ochre-soft text-warn" : "bg-bg text-muted";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

function Thread({ conv, busy, act }: { conv: Conv; busy: boolean; act: (b: Record<string, unknown>) => Promise<void> }) {
  const [reply, setReply] = useState("");
  const draft = conv.messages.find((m) => m.status === "draft");

  return (
    <>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="font-semibold">{conv.buyerName ?? `Buyer ${conv.buyerRef.slice(-4)}`} <span className="text-xs uppercase text-muted">· {conv.channel}</span></p>
        <button disabled={busy} onClick={() => act({ type: "pause_ai", conversationId: conv.id, paused: !conv.aiPaused })} className="rounded-full border border-line px-3 py-1 text-sm hover:border-indigo">
          {conv.aiPaused ? "Let Oja help again" : "Take over (pause AI)"}
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {conv.messages.filter((m) => m.status === "sent").map((m) => (
          <div key={m.id} className={`flex ${m.role === "buyer" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${m.role === "buyer" ? "border border-line bg-bg" : m.role === "system" ? "bg-ochre-soft text-warn" : "bg-indigo-soft"}`}>
              <p className="mb-0.5 text-[11px] font-semibold text-muted">{m.role === "agent" ? "Oja (AI)" : m.role === "vendor" ? "You" : m.role === "system" ? "System" : "Buyer"}</p>
              {m.body}
            </div>
          </div>
        ))}
      </div>
      {draft && <DraftBox key={draft.id} draft={draft} conv={conv} busy={busy} act={act} />}
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!reply.trim()) return;
          await act({ type: "send", conversationId: conv.id, body: reply });
          setReply("");
        }}
      >
        <label htmlFor="vendor-reply" className="sr-only">Reply as yourself</label>
        <input id="vendor-reply" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply as yourself" className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-2 text-sm outline-none focus:border-indigo" />
        <button disabled={busy || !reply.trim()} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface disabled:opacity-40">Send</button>
      </form>
    </>
  );
}

function DraftBox({ draft, conv, busy, act }: { draft: Msg; conv: Conv; busy: boolean; act: (b: Record<string, unknown>) => Promise<void> }) {
  const [edit, setEdit] = useState<string | null>(null);
  return (
        <div className="border-t border-line bg-indigo-soft/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo">Oja&apos;s draft{conv.needsHuman ? " · flagged for your review" : ""}</p>
          {edit === null ? (
            <p className="mt-1 whitespace-pre-wrap text-sm">{draft.body}</p>
          ) : (
            <textarea value={edit} onChange={(e) => setEdit(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-line bg-surface p-2 text-sm" />
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => act({ type: "approve_draft", messageId: draft.id, ...(edit !== null ? { body: edit } : {}) })} className="rounded-full bg-indigo px-4 py-1.5 text-sm font-semibold text-surface">
              {edit === null ? "Send" : "Send edited"}
            </button>
            {edit === null && <button onClick={() => setEdit(draft.body)} className="rounded-full border border-line px-4 py-1.5 text-sm">Edit</button>}
            <button disabled={busy} onClick={() => act({ type: "redraft", conversationId: conv.id })} className="rounded-full border border-line px-4 py-1.5 text-sm">Redraft</button>
            <button disabled={busy} onClick={() => act({ type: "discard_draft", messageId: draft.id })} className="rounded-full px-4 py-1.5 text-sm text-muted">Discard</button>
          </div>
        </div>
        );
}

function OrderCard({ o, cur, busy, act }: { o: Order; cur: string; busy: boolean; act: (b: Record<string, unknown>) => Promise<void> }) {
  const [tn, setTn] = useState("");
  return (
    <div className="rounded-xl border border-line bg-surface p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-mono font-semibold">{o.ref}</span>
        <Tag tone={o.status === "paid" ? "ochre" : o.status === "awaiting_payment" ? "muted" : "indigo"}>{STATUS[o.status] ?? o.status}</Tag>
      </div>
      <p className="mt-1 text-muted">{o.lines.map((l) => `${l.name} ×${l.qty}`).join(", ")}</p>
      <p className="mt-1 font-semibold">{money(o.totalMinor, o.currency || cur)} <span className="font-normal text-muted">· {o.rail === "paypal" ? "PayPal" : "Bank transfer"}</span></p>
      <p className="text-xs text-muted">Ship to {o.shipTo.name}, {o.shipTo.city}, {o.shipTo.country}{o.carrier ? ` · ${o.carrier}` : ""}</p>
      {o.status === "awaiting_payment" && o.rail === "bank_transfer" && (
        <button disabled={busy} onClick={() => act({ type: "confirm_transfer", orderId: o.id })} className="mt-2 rounded-full border border-line px-3 py-1 text-xs font-semibold hover:border-indigo">
          I&apos;ve received the transfer
        </button>
      )}
      {o.status === "paid" && (
        <form className="mt-2 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); act({ type: "ship", orderId: o.id, trackingNumber: tn }); }}>
          <label htmlFor={`tn-${o.id}`} className="sr-only">Tracking number</label>
          <input id={`tn-${o.id}`} value={tn} onChange={(e) => setTn(e.target.value)} placeholder="Tracking number" className="min-w-0 flex-1 rounded-full border border-line bg-bg px-3 py-1 text-xs" />
          <button disabled={busy || tn.length < 4} className="rounded-full bg-indigo px-3 py-1 text-xs font-semibold text-surface disabled:opacity-40">Mark shipped</button>
        </form>
      )}
      {o.trackingNumber && <p className="mt-1 text-xs text-muted">Tracking {o.trackingNumber}{o.rail === "paypal" ? " · added to PayPal" : ""}</p>}
    </div>
  );
}

function SignIn({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [key, setKey] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-16">
      <h1 className="font-display text-3xl">Seller sign-in</h1>
      <p className="mt-2 text-sm text-muted">Enter your dashboard key. (Demo: see the README.)</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          const res = await fetch(`/api/vendor/${slug}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
          if (res.ok) onDone();
          else setErr((await res.json()).error ?? "Sign-in failed");
        }}
      >
        <label htmlFor="key" className="block text-sm font-semibold">Dashboard key</label>
        <input id="key" type="password" value={key} onChange={(e) => setKey(e.target.value)} className="w-full rounded-lg border border-line bg-surface px-3 py-2" autoComplete="current-password" />
        {err && <p className="text-sm text-warn">{err}</p>}
        <button className="w-full rounded-full bg-indigo py-2.5 font-semibold text-surface">Sign in</button>
      </form>
    </main>
  );
}
