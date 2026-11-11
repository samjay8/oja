"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Minimum 44px tap target on phones for the kit's small controls. */
export const TAP = "max-sm:h-11 max-sm:min-h-11";

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

/**
 * Keeps something mounted while it animates out. Already open on mount = at rest
 * (no entrance), unless `appear`. Returns whether to render and the data-open value.
 */
export function usePresence(open: boolean, { appear = false, exitMs = 300 }: { appear?: boolean; exitMs?: number } = {}) {
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(open && !appear);
  if (open && !render) setRender(true);
  useEffect(() => {
    if (open) {
      let r2 = 0;
      const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setShown(true)); });
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
    }
    const r = requestAnimationFrame(() => setShown(false));
    const t = setTimeout(() => setRender(false), exitMs);
    return () => { cancelAnimationFrame(r); clearTimeout(t); };
  }, [open, exitMs]);
  return { render: render || open, shown: shown && open };
}

/** Height + opacity show/hide (globals .reveal). Hidden content is inert. */
export function Reveal({ open, appear, children, className }: { open: boolean; appear?: boolean; children: ReactNode; className?: string }) {
  const { render, shown } = usePresence(open, { appear });
  if (!render) return null;
  return (
    <div className={cx("reveal", className)} data-open={shown ? "true" : "false"} inert={!open}>
      <div>{children}</div>
    </div>
  );
}

/**
 * Which keys are new since the previous data. The first set is the baseline (nothing
 * is new), so content present on load stays at rest and a poll never re-flags it.
 */
export function useFresh(keys: string[] | null) {
  const sig = keys ? keys.join("\u0000") : null;
  const [s, setS] = useState<{ sig: string | null; before: Set<string> | null; all: Set<string> | null }>({ sig: null, before: null, all: null });
  const changed = sig !== s.sig;
  if (changed) setS({ sig, before: s.all, all: keys ? new Set(keys) : null });
  const before = changed ? s.all : s.before;
  return useCallback((k: string) => before !== null && !before.has(k), [before]);
}

/** Short-lived confirmation text. Stays long enough to read, then fades. */
export function useFlash() {
  const [flash, setFlash] = useState<{ id: number; text: string } | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setOpen(false), Math.max(2200, flash.text.length * 55));
    return () => clearTimeout(t);
  }, [flash]);
  const show = useCallback((text: string) => {
    setFlash((f) => ({ id: (f?.id ?? 0) + 1, text }));
    setOpen(true);
  }, []);
  const hide = useCallback(() => setOpen(false), []);
  return { text: flash?.text ?? "", id: flash?.id ?? 0, open, show, hide };
}

/** Calm confirmation pinned to the bottom of the screen (role=status). */
export function Toast({ flash }: { flash: ReturnType<typeof useFlash> }) {
  const { render, shown } = usePresence(flash.open);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4" role="status" aria-live="polite">
      {render && (
        <p key={flash.id} className="pop pointer-events-auto max-w-md border border-line-strong bg-surface px-4 py-2.5 text-sm text-strong shadow-[3px_3px_0_0_var(--line)]" data-open={shown ? "true" : "false"}>
          <span aria-hidden className="mr-2 inline-block size-1.5 translate-y-[-2px] bg-dye" />
          {flash.text}
        </p>
      )}
    </div>
  );
}

/** Inline "Saved" note that fades out on its own. */
export function SavedNote({ flash, className }: { flash: ReturnType<typeof useFlash>; className?: string }) {
  const { render, shown } = usePresence(flash.open);
  return (
    <span role="status" aria-live="polite" className={cx("inline-flex min-w-0 items-center", className)}>
      {render && (
        <span className="pop inline-flex items-center gap-2 text-sm text-strong" data-open={shown ? "true" : "false"}>
          <span aria-hidden className="inline-block size-1.5 bg-dye" />
          {flash.text}
        </span>
      )}
    </span>
  );
}

/** Message under a field. Link it with aria-describedby on the input. */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return <p id={id} className="rise mt-1 border-l-2 border-dye pl-2 text-xs font-semibold text-strong">{children}</p>;
}

/** Two-step destructive action, inline: no browser dialog. Escape or Keep backs out. */
export function ConfirmButton({ label, prompt, confirmLabel, busyLabel, onConfirm, disabled, size = "sm", className }: {
  label: string; prompt: string; confirmLabel: string; busyLabel: string; onConfirm: () => Promise<unknown>;
  disabled?: boolean; size?: "sm" | "md"; className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!armed) {
    return (
      <Button type="button" size={size} variant="ghost" disabled={disabled} className={cx(size === "sm" && TAP, className)} onClick={() => setArmed(true)}>
        {label}
      </Button>
    );
  }
  return (
    <span
      role="group"
      aria-label={prompt}
      className={cx("fade inline-flex flex-wrap items-center gap-2", className)}
      onKeyDown={(e) => { if (e.key === "Escape" && !busy) setArmed(false); }}
    >
      <span className="text-xs text-muted">{prompt}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={TAP}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setArmed(false);
          }
        }}
      >
        {busy ? busyLabel : confirmLabel}
      </Button>
      <Button type="button" size="sm" variant="ghost" className={TAP} disabled={busy} autoFocus onClick={() => setArmed(false)}>Keep</Button>
    </span>
  );
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
      className="inline-flex items-center gap-2 text-xs font-semibold text-strong disabled:opacity-40 max-sm:min-h-11"
    >
      <span className={cx("ease-ui relative inline-flex h-5 w-9 shrink-0 border border-dye", checked ? "bg-dye" : "bg-surface")}>
        <span
          className={cx(
            "absolute top-0.5 size-3.5 transition-[left,background-color] duration-[var(--dur-2)] ease-[var(--ease-out)] motion-reduce:transition-none",
            checked ? "left-[18px] bg-on-dye" : "left-0.5 bg-dye",
          )}
        />
      </span>
      <span className="font-mono uppercase tracking-wider">{checked ? "On" : "Off"}</span>
    </button>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1600);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
        } catch {}
      }}
      className={cx("ease-ui h-8 min-w-[5.5rem] shrink-0 border border-dye px-3 font-mono text-[11px] uppercase tracking-wider disabled:opacity-40 max-sm:h-11", done ? "bg-dye text-on-dye" : "text-dye hover:bg-wash")}
    >
      <span key={done ? "done" : "idle"} className="fade inline-block" aria-live="polite">{done ? "Copied" : label}</span>
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
export function Notice({ children, tone = "info", className }: { children: ReactNode; tone?: "info" | "error" | "ok"; className?: string }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "rise px-3 py-2 text-sm",
        tone === "error" && "border-l-4 border-dye bg-wash font-semibold text-strong",
        tone === "ok" && "border border-dashed border-line-strong text-strong",
        tone === "info" && "border-l-2 border-line-strong text-muted",
        className,
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

const Bone = ({ className }: { className?: string }) => <div className={cx("bg-sunk", className)} />;

/**
 * Calm skeleton on the adire-dots ground. Fades in after a beat so quick loads
 * never flash it.
 */
export function Loading({ label, layout = "cards" }: { label: string; layout?: "cards" | "inbox" | "form" }) {
  return (
    <div role="status" aria-live="polite" className="fade mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6" style={{ animationDelay: "150ms" }}>
      <span className="sr-only">{label}</span>
      <div aria-hidden className={cx("space-y-5", layout !== "inbox" && "mx-auto", layout === "cards" && "max-w-5xl", layout === "form" && "max-w-3xl")}>
        <div className="space-y-2 border-b border-line pb-4">
          <Bone className="h-3 w-40" />
          <Bone className="h-9 w-72 max-w-full" />
        </div>
        {layout === "inbox" ? (
          <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)_21rem]">
            <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 border border-line bg-surface" />)}</div>
            <div className="adire-dots h-[50vh] border border-line" />
            <div className="hidden space-y-2 lg:block"><div className="adire-dots h-48 border border-line" /></div>
          </div>
        ) : layout === "form" ? (
          <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="adire-dots h-32 border border-line" />)}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="adire-dots h-40 border border-line" />)}</div>
        )}
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}
