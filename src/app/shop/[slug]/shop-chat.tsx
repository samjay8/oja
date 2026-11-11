"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, buttonClass, InkDots, Stamp, Tag } from "@/components/ui";
import { LanguagePicker } from "@/components/buyer/language-picker";
import { isLanguage, UI, type LanguageCode } from "@/lib/languages";
import { usePoll } from "../../use-poll";

type Msg = { id: string; role: "buyer" | "agent" | "vendor" | "system"; body: string; at: string };

const SUGGESTIONS = [
  "Hi! What do you have for a wedding in London?",
  "How much is delivery to Houston?",
  "Last price for the adire two-piece?",
  "I need aso-ebi fabric for 25 people",
];

const memory = new Map<string, string>();

function readKey(key: string) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function writeKey(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/** Stable per-browser chat session. Falls back to memory when storage is blocked. */
function sessionFor(shop: string) {
  const key = `oja_session_${shop}`;
  const existing = readKey(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  writeKey(key, id);
  return id;
}

const noSubscribe = () => () => {};

// Buyer-chosen language, per shop, shared with any listener in this tab.
const langListeners = new Set<() => void>();
const subscribeLang = (fn: () => void) => {
  langListeners.add(fn);
  return () => langListeners.delete(fn);
};
const langKey = (shop: string) => `oja_lang_${shop}`;
function storedLang(shop: string): LanguageCode | null {
  const v = readKey(langKey(shop));
  return isLanguage(v) ? v : null;
}
function setStoredLang(shop: string, lang: LanguageCode) {
  writeKey(langKey(shop), lang);
  langListeners.forEach((fn) => fn());
}
function browserLang(): LanguageCode | null {
  try {
    const base = navigator.language.toLowerCase().split("-")[0];
    return isLanguage(base) ? base : null;
  } catch {
    return null;
  }
}

type ChatState = { messages: Msg[]; sellerReviewing: boolean; language?: LanguageCode | null };

export type PaymentNotice = { order: string; payment: string } | null;

function noticeView(n: NonNullable<PaymentNotice>) {
  const { order: ref, payment: p } = n;
  if (p === "paid") return { stamp: "Paid", filled: true, text: `Payment received for ${ref}. Thank you! The seller will add tracking when it ships.` };
  if (p === "cancelled") return { stamp: "Cancelled", filled: false, text: `Payment for ${ref} was cancelled. Nothing was charged. You can use the same link to try again.` };
  if (p === "mismatch") return { stamp: "On hold", filled: false, text: `Something didn't match on ${ref}, so we paused it. The seller has been told and will reach out.` };
  return { stamp: "Pending", filled: false, text: `We couldn't confirm the payment for ${ref} yet. The seller has been told and will check.` };
}

function Receipt({ notice }: { notice: NonNullable<PaymentNotice> }) {
  const v = noticeView(notice);
  return (
    <div role="status" className="print-in receipt-edge mx-3 mt-3 border border-b-0 border-line-strong bg-sunk px-4 pt-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">Order</p>
          <p className="break-all font-mono text-sm text-strong">{notice.order}</p>
        </div>
        <span className="fade shrink-0" style={{ animationDelay: "180ms" }}>
          <Stamp filled={v.filled} className="text-xs">{v.stamp}</Stamp>
        </span>
      </div>
      <p className="mt-2 border-t border-dashed border-line-strong pb-2 pt-2 text-sm text-text">{v.text}</p>
    </div>
  );
}

function isPayPal(u: string) {
  try {
    const h = new URL(u).hostname;
    return h === "paypal.com" || h.endsWith(".paypal.com");
  } catch {
    return false;
  }
}

function Linkified({ text, payLabel }: { text: string; payLabel: string }) {
  // Trailing punctuation stays text, so "…token=ABC." links to the real token.
  const parts = text.split(/(https?:\/\/[^\s)<>"']*[^\s)<>"'.,!?;:])/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          isPayPal(p) ? (
            <a key={i} href={p} target="_self" className={buttonClass({ size: "lg" }) + " my-2 w-full text-[15px] sm:w-auto"}>
              {payLabel} <span aria-hidden>→</span>
            </a>
          ) : (
            <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all font-semibold underline underline-offset-2">{p}</a>
          )
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function timeOf(at: string) {
  if (!at) return null;
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Scroll a log to its end: smooth for small steps, instant for long jumps or reduced motion. */
function scrollEnd(el: HTMLElement, force?: ScrollBehavior) {
  const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
  const calm = !window.matchMedia("(prefers-reduced-motion: reduce)").matches && gap < el.clientHeight * 2;
  el.scrollTo({ top: el.scrollHeight, behavior: force ?? (calm ? "smooth" : "auto") });
}

// The optimistic buyer message keeps its key when the server copy replaces it, so it never flashes.
type Pending = { key: string; body: string; before: Set<string> };
type Row = Msg & { key: string; fresh: boolean; pending?: boolean };

const LINE = 24;
const MAX_LINES = 5;

export function ShopChat({ shop, shopName, notice }: { shop: string; shopName: string; notice: PaymentNotice }) {
  const session = useSyncExternalStore(noSubscribe, () => sessionFor(shop), () => null);
  const chosen = useSyncExternalStore(subscribeLang, () => storedLang(shop), () => null);
  const detected = useSyncExternalStore(noSubscribe, browserLang, () => null);
  const poll = usePoll<ChatState>(session ? `/api/chat?shop=${encodeURIComponent(shop)}&session=${session}` : null, 4000);
  const lang: LanguageCode = chosen ?? poll.data?.language ?? detected ?? "en";
  const t = UI[lang];

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [typingDue, setTypingDue] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<{ body: string; message: string } | null>(null);
  // Ids already on screen at first load: shown without the "just arrived" highlight.
  const [baseline, setBaseline] = useState<Set<string> | null>(null);
  const [away, setAway] = useState(false);
  const [seenKey, setSeenKey] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const autoAt = useRef(0);
  const lastKeyRef = useRef<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const server = poll.data?.messages ?? [];
  if (baseline === null && (poll.data || sending)) setBaseline(new Set(sending ? [] : server.map((m) => m.id)));

  const match = pending
    ? server.find((m) => m.role === "buyer" && !pending.before.has(m.id) && !aliases[m.id] && m.body.trim() === pending.body.trim())
    : undefined;
  if (pending && match) {
    setAliases((a) => ({ ...a, [match.id]: pending.key }));
    setPending(null);
  }

  const rows: Row[] = server.map((m) => ({ ...m, key: aliases[m.id] ?? m.id, fresh: baseline !== null && !baseline.has(m.id) }));
  if (pending && !match) rows.push({ id: pending.key, key: pending.key, role: "buyer", body: pending.body, at: "", fresh: true, pending: true });

  const reviewing = Boolean(poll.data?.sellerReviewing);
  const typing = (sending && typingDue) || reviewing;
  const typingLabel = reviewing && !sending ? t.reviewing(shopName) : t.typing;
  const lastKey = rows.at(-1)?.key ?? null;
  const showPill = away && lastKey !== null && lastKey !== seenKey;

  function toBottom() {
    const el = listRef.current;
    if (!el) return;
    autoAt.current = Date.now();
    scrollEnd(el);
  }

  useEffect(() => {
    lastKeyRef.current = lastKey;
  }, [lastKey]);

  // Follow the conversation while the buyer is at the bottom, including the typing row growing.
  useEffect(() => {
    const el = contentRef.current;
    const list = listRef.current;
    if (!el || !list) return;
    const ro = new ResizeObserver(() => {
      if (!stick.current) return;
      autoAt.current = Date.now();
      scrollEnd(list);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, LINE * MAX_LINES + 22)}px`;
  }, [text]);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 72;
    if (near) {
      stick.current = true;
      setAway(false);
      setSeenKey(lastKeyRef.current);
    } else if (Date.now() - autoAt.current > 700) {
      // Only the buyer scrolling up (not our own smooth scroll) unsticks the view.
      stick.current = false;
      setAway(true);
    }
  }

  async function send(body: string) {
    if (!session || !body.trim() || sending) return;
    setSending(true);
    setFailed(null);
    setTypingDue(false);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTypingDue(true), 150);
    setText((cur) => (cur === body ? "" : cur));
    setPending({ key: `local-${crypto.randomUUID()}`, body: body.trim(), before: new Set(server.map((m) => m.id)) });
    stick.current = true;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shop, session, text: body, language: lang }),
      }).catch(() => {
        throw new Error("You seem to be offline. Check your connection, then try again.");
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 429 && data.error ? data.error : "Your message didn't go through. Please try again.");
      poll.setData(data);
    } catch (e) {
      setFailed({ body, message: e instanceof Error ? e.message : "Your message didn't go through. Please try again." });
      setPending(null);
    } finally {
      clearTimeout(typingTimer.current);
      setTypingDue(false);
      setSending(false);
    }
  }

  const empty = rows.length === 0 && !sending;

  return (
    <div lang={lang} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className="flex items-center gap-2 font-semibold text-strong">
            <span aria-hidden className="size-2 rounded-full bg-dye" />
            {t.assistant}
          </p>
          <p className="mt-0.5 max-w-[60ch] text-xs leading-relaxed text-muted">{t.aiNotice(shopName)}</p>
        </div>
        <LanguagePicker value={lang} label={t.language} onChange={(l) => setStoredLang(shop, l)} />
      </div>

      {notice && <Receipt notice={notice} />}

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={listRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
          <div ref={contentRef}>
            {empty && (
              <div className="fade mx-auto max-w-md px-2 py-8 text-center sm:py-12">
                <p className="font-display text-xl leading-snug text-strong sm:text-2xl">{t.welcome(shopName)}</p>
                <p className="mt-2 text-sm text-muted" lang="en">Not sure where to start? Tap a question.</p>
                <div className="stagger mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center" lang="en">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      disabled={!session}
                      className="rise ease-ui min-h-11 border border-line-strong bg-surface px-3 py-2 text-left text-sm text-text hover:border-dye hover:bg-wash active:translate-y-px disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div role="log" aria-live="polite" aria-relevant="additions" aria-label={`Chat with ${shopName}`} className="space-y-3">
              {rows.map((m) => {
                const time = timeOf(m.at);
                if (m.role === "system")
                  return (
                    <p key={m.key} className={`${m.fresh ? "rise" : "fade"} mx-auto max-w-md border border-dashed border-line-strong bg-sunk px-3 py-2 text-center font-mono text-xs leading-relaxed text-text`}>
                      {m.body}
                    </p>
                  );
                const buyer = m.role === "buyer";
                return (
                  <div key={m.key} className={`${m.fresh ? "rise" : "fade"} flex ${buyer ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-[15px] leading-relaxed transition-opacity duration-300 sm:max-w-[75%] ${
                        buyer ? "bg-dye text-on-dye shadow-[3px_3px_0_0_var(--dye-deep)]" : `border border-line bg-surface text-text ${m.fresh ? "ink-new" : ""}`
                      } ${m.pending ? "opacity-75" : ""}`}
                    >
                      {!buyer && (
                        <p className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted">
                          {m.role === "vendor" ? <>{shopName} <Tag>Seller</Tag></> : t.assistant}
                        </p>
                      )}
                      <Linkified text={m.body} payLabel={t.pay} />
                      {time && <p className={`mt-1 text-right font-mono text-[10px] ${buyer ? "opacity-70" : "text-muted"}`}>{time}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="reveal" data-open={typing} aria-hidden>
              <div>
                <div className="flex justify-start pt-3">
                  <div className="border border-dashed border-line-strong bg-surface px-3 py-2">
                    <InkDots label={typingLabel} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p role="status" className="sr-only">{typing ? typingLabel : ""}</p>

        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <button
            type="button"
            data-open={showPill}
            inert={!showPill}
            onClick={() => {
              stick.current = true;
              toBottom();
            }}
            className="pop pointer-events-auto flex min-h-11 items-center gap-2 border border-line-strong bg-surface px-4 text-sm font-semibold text-strong shadow-[3px_3px_0_0_var(--line)] hover:bg-wash"
          >
            <span lang="en">New message</span> <span aria-hidden>↓</span>
          </button>
        </div>
      </div>

      {failed && (
        <div role="alert" className="rise mx-3 mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border border-dashed border-dye bg-surface px-3 py-2">
          <p className="min-w-0 flex-1 basis-48 text-sm text-strong" lang="en">{failed.message}</p>
          <div className="flex gap-1">
            <Button type="button" size="sm" className="h-11 sm:h-9" onClick={() => send(failed.body)} disabled={sending}>
              <span lang="en">Try again</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-11 sm:h-9"
              onClick={() => {
                setText((cur) => cur || failed.body);
                setFailed(null);
                inputRef.current?.focus();
              }}
            >
              <span lang="en">Edit</span>
            </Button>
          </div>
        </div>
      )}

      <form
        className="sticky bottom-0 flex items-end gap-2 border-t border-line bg-paper px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
          inputRef.current?.focus();
        }}
      >
        <label htmlFor="chat-input" className="sr-only">{t.placeholder}</label>
        <textarea
          ref={inputRef}
          id="chat-input"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === 229) return;
            e.preventDefault();
            send(text);
          }}
          placeholder={t.placeholder}
          maxLength={2000}
          autoComplete="off"
          enterKeyHint="send"
          aria-describedby="chat-hint"
          className="ease-ui block min-h-11 min-w-0 flex-1 resize-none border border-line-strong bg-surface px-3 py-2.5 text-[15px] leading-6 text-strong outline-none placeholder:text-muted focus:border-dye"
        />
        <Button type="submit" className="h-11 shrink-0" onPointerDown={(e) => e.preventDefault()} disabled={!session || sending || !text.trim()}>
          {t.send}
        </Button>
        <span id="chat-hint" className="sr-only" lang="en">Enter sends. Shift and Enter adds a new line.</span>
      </form>
    </div>
  );
}
