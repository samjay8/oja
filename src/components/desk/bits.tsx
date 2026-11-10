"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** One-shot JSON loader for desk pages. status 401 = signed out, 404 = route not deployed. */
export function useDeskData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        if (!alive) return;
        setStatus(r.status);
        if (r.ok) setData((await r.json()) as T);
      })
      .catch(() => alive && setStatus(0));
    return () => {
      alive = false;
    };
  }, [url, nonce]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, status, reload, setData };
}

export async function sendJson<T = Record<string, unknown>>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((out as { error?: string }).error ?? `Request failed (${res.status})`);
  return out as T;
}

const noop = () => () => {};
/** window.location.origin without a hydration mismatch. */
export function useOrigin() {
  return useSyncExternalStore(noop, () => window.location.origin, () => "");
}

/** Square on/off switch. Pressed state shown by fill, not colour. */
export function Toggle({ checked, onChange, label, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-xs font-semibold text-strong disabled:opacity-40"
    >
      <span className={cx("relative inline-flex h-5 w-9 shrink-0 border border-dye transition-colors", checked ? "bg-dye" : "bg-surface")}>
        <span className={cx("absolute top-0.5 size-3.5 transition-[left]", checked ? "left-[18px] bg-on-dye" : "left-0.5 bg-dye")} />
      </span>
      <span className="font-mono uppercase tracking-wider">{checked ? "On" : "Off"}</span>
    </button>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
      className="h-8 shrink-0 border border-dye px-3 font-mono text-[11px] uppercase tracking-wider text-dye hover:bg-wash disabled:opacity-40"
    >
      <span aria-live="polite">{done ? "Copied" : label}</span>
    </button>
  );
}

/** Mono value with a copy button, for URLs and IDs. */
export function CopyLine({ value, label }: { value: string; label: string }) {
  return (
    <div className="space-y-1">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <div className="flex items-center gap-2 border border-line bg-sunk p-1.5 pl-3">
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-strong" title={value}>{value || "…"}</code>
        <CopyButton text={value} label={`Copy`} />
      </div>
    </div>
  );
}

/** Inline status message. Errors get a heavy rule, not a red. */
export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "ok" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "px-3 py-2 text-sm",
        tone === "error" && "border-l-4 border-dye bg-wash font-semibold text-strong",
        tone === "ok" && "border border-dashed border-line-strong text-strong",
        tone === "info" && "border-l-2 border-line-strong text-muted",
      )}
    >
      {children}
    </p>
  );
}

export function DeskHeading({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">{kicker}</p>
        <h1 className="mt-1 font-display text-3xl text-strong sm:text-4xl">{title}</h1>
      </div>
      {children}
    </header>
  );
}

export function Loading({ label }: { label: string }) {
  return <p className="px-4 py-10 text-sm text-muted sm:px-6" role="status">{label}</p>;
}
