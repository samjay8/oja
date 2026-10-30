"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePoll } from "../../use-poll";

type Msg = { id: string; role: "buyer" | "agent" | "vendor" | "system"; body: string; at: string };

const SUGGESTIONS = [
  "Hi! What do you have for a wedding in London?",
  "How much is delivery to Houston?",
  "Last price for the adire two-piece?",
  "I need aso-ebi fabric for 25 people",
];

const memorySessions = new Map<string, string>();

/** Stable per-browser chat session. Falls back to memory when storage is blocked. */
function sessionFor(shop: string) {
  const key = `oja_session_${shop}`;
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    if (!memorySessions.has(key)) memorySessions.set(key, crypto.randomUUID());
    return memorySessions.get(key)!;
  }
}

const noSubscribe = () => () => {};

type ChatState = { messages: Msg[]; sellerReviewing: boolean };

export type PaymentNotice = { order: string; payment: string } | null;

function bannerText(n: PaymentNotice) {
  if (!n) return null;
  const { order: ref, payment: p } = n;
  return p === "paid" ? `Payment received for ${ref}. Thank you!`
    : p === "cancelled" ? `Payment for ${ref} was cancelled. You can use the same link to try again.`
    : p === "mismatch" ? `Something didn't match on ${ref}. The seller has been alerted and will reach out.`
    : `We couldn't confirm the payment for ${ref} yet. The seller has been alerted.`;
}

function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target={p.includes("paypal.com") ? "_self" : "_blank"} rel="noreferrer" className="break-all font-semibold underline">
            {p.includes("paypal.com") ? "Pay securely with PayPal →" : p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function ShopChat({ shop, shopName, notice }: { shop: string; shopName: string; notice: PaymentNotice }) {
  const session = useSyncExternalStore(noSubscribe, () => sessionFor(shop), () => null);
  const poll = usePoll<ChatState>(session ? `/api/chat?shop=${shop}&session=${session}` : null, 4000);
  const [optimistic, setOptimistic] = useState<Msg | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const banner = bannerText(notice);
  const messages = [...(poll.data?.messages ?? []), ...(optimistic ? [optimistic] : [])];
  const reviewing = Boolean(poll.data?.sellerReviewing);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function send(body: string) {
    if (!session || !body.trim() || sending) return;
    setSending(true);
    setError(null);
    setText("");
    setOptimistic({ id: "pending", role: "buyer", body, at: "" });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, session, text: body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Message not sent");
      poll.setData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message not sent");
      setText(body);
    } finally {
      setOptimistic(null);
      setSending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {banner && <div className="border-b border-line bg-indigo-soft px-5 py-3 text-sm font-semibold text-indigo">{banner}</div>}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
        {messages.length === 0 && !sending && (
          <div className="mx-auto max-w-md py-8 text-center">
            <p className="font-display text-xl">Ẹ káàbọ̀! Ask {shopName} anything.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-indigo">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === "system" ? (
            <p key={m.id} className="mx-auto max-w-md rounded-lg bg-ochre-soft px-3 py-2 text-center text-sm text-warn">{m.body}</p>
          ) : (
            <div key={m.id} className={`flex ${m.role === "buyer" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                  m.role === "buyer" ? "rounded-br-sm bg-[var(--bubble-buyer)] text-[var(--bubble-buyer-ink)]" : "rounded-bl-sm border border-line bg-bg"
                }`}
              >
                {m.role !== "buyer" && (
                  <p className="mb-0.5 text-xs font-semibold text-muted">{m.role === "vendor" ? shopName : "Oja · AI assistant"}</p>
                )}
                <Linkified text={m.body} />
              </div>
            </div>
          ),
        )}
        {(sending || reviewing) && (
          <p className="text-sm text-muted">{sending ? "Oja is typing…" : `${shopName} is reviewing the reply…`}</p>
        )}
        <div ref={endRef} />
      </div>
      {error && <p className="px-5 pb-2 text-sm text-warn">{error}</p>}
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">Message</label>
        <input
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-2.5 outline-none focus:border-indigo"
        />
        <button disabled={sending || !text.trim()} className="rounded-full bg-indigo px-5 py-2.5 font-semibold text-surface disabled:opacity-40">
          Send
        </button>
      </form>
    </div>
  );
}
