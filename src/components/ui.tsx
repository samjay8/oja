// Oja UI kit. Monotone indigo ("Aró"): use the semantic colour tokens (paper,
// surface, sunk, line, muted, text, strong, dye, on-dye, wash) and never add a hue.
// Server- and client-safe: no hooks here.

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * The Oja mark: the Yorùbá letter Ọ with its àmì. The ring is a speech bubble
 * (the chat); the dot beneath it is the coin that drops out of it (the sale).
 * Drawn in currentColor, so it takes whatever ink it sits in.
 */
export function Logomark({ className = "size-7", title, greet = false }: { className?: string; title?: string; /** Drop the àmì into place once on load. */ greet?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={cx("oja-mark overflow-visible", greet && "oja-mark-greet", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path
        className="oja-bubble"
        d="M15.35 26.97 A11 11 0 1 0 10.99 23.31 L9 30 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <circle className="oja-dot" cx="20" cy="35.4" r="2.7" fill="currentColor" />
    </svg>
  );
}

/** Ọjà wordmark: the mark, the name with its àmì, and an optional kicker. */
export function Wordmark({ size = "md", kicker = true, mark = true }: { size?: "sm" | "md" | "lg"; kicker?: boolean; mark?: boolean }) {
  const s = size === "lg" ? "text-6xl sm:text-8xl" : size === "sm" ? "text-2xl" : "text-3xl";
  const m = size === "lg" ? "size-14 sm:size-20" : size === "sm" ? "size-6" : "size-8";
  return (
    <span className="oja-live inline-flex items-center gap-2 text-strong">
      {mark && <Logomark className={cx(m, "shrink-0")} />}
      <span className="inline-flex items-baseline gap-2">
        <span lang="yo" className={cx("font-display leading-none tracking-tight", s)}>Ọjà</span>
        {kicker && <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">market agent</span>}
      </span>
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "outline" | "ghost"; size?: "sm" | "md" | "lg" };

export function buttonClass({ variant = "solid", size = "md" }: Pick<ButtonProps, "variant" | "size"> = {}) {
  return cx(
    "inline-flex items-center justify-center gap-2 font-semibold transition-[background-color,border-color,color,box-shadow,transform,opacity,outline-color,outline-offset] duration-200 ease-[cubic-bezier(.2,.7,.2,1)] active:duration-100 disabled:cursor-not-allowed disabled:opacity-40",
    size === "sm" ? "h-8 px-3 text-xs" : size === "lg" ? "h-12 px-6 text-base" : "h-10 px-4 text-sm",
    // Solid presses into its own offset shadow, like a stamp meeting paper.
    variant === "solid" && "bg-dye text-on-dye shadow-[3px_3px_0_0_var(--dye-deep)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_var(--dye-deep)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0_0_0_0_var(--dye-deep)]",
    variant === "outline" && "border border-dye text-dye hover:bg-wash hover:shadow-[inset_0_0_0_1px_var(--dye)] active:translate-y-px",
    variant === "ghost" && "text-muted hover:bg-wash hover:text-strong active:translate-y-px",
  );
}

export function Button({ variant, size, className, ...rest }: ButtonProps) {
  return <button {...rest} className={cx(buttonClass({ variant, size }), className)} />;
}

/** Rubber-stamp status (PAID, SHIPPED, DRAFT…). `filled` for the most important state. */
export function Stamp({ children, filled = false, tilt = true, className }: { children: ReactNode; filled?: boolean; tilt?: boolean; className?: string }) {
  return (
    <span
      className={cx(
        "inline-block border-2 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase leading-none tracking-[0.18em]",
        filled ? "border-dye bg-dye text-on-dye" : "border-dye text-dye",
        tilt && "-rotate-2",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small quiet label. `dashed` = pending or beta. */
export function Tag({ children, dashed = false, className }: { children: ReactNode; dashed?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-[var(--radius-tag)] border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted", dashed ? "border-dashed border-line-strong" : "border-line", className)}>
      {children}
    </span>
  );
}

/** Notched fabric-tag card. `pattern` adds an adire band across the top. */
export function Swatch({ children, pattern, className, as: As = "div" }: { children: ReactNode; pattern?: "dots" | "stitch" | "olokun" | "grid"; className?: string; as?: "div" | "section" | "article" | "li" }) {
  return (
    <As className={cx("swatch relative border border-line bg-surface", className)}>
      {pattern && <div aria-hidden className={cx("h-3 border-b border-line", `adire-${pattern}`)} />}
      {children}
    </As>
  );
}

/** Mono money figure. Pass a pre-formatted string; never compute prices in UI. */
export function Price({ children, size = "md", className }: { children: ReactNode; size?: "sm" | "md" | "lg"; className?: string }) {
  return <span className={cx("font-mono tabular-nums text-strong", size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-base", className)}>{children}</span>;
}

/** Decorative adire strip. */
export function PatternBand({ pattern = "olokun", className }: { pattern?: "dots" | "stitch" | "olokun" | "grid"; className?: string }) {
  return <div aria-hidden className={cx(`adire-${pattern}`, className)} />;
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("font-mono text-[11px] uppercase tracking-[0.22em] text-muted", className)}>{children}</p>;
}

const fieldBase = "w-full border border-line bg-surface px-3 py-2 text-sm text-strong outline-none placeholder:text-muted focus:border-dye transition-[border-color,outline-color,outline-offset] duration-200";

export function Field({ label, hint, id, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; id: string }) {
  return (
    <label htmlFor={id} className="block space-y-1">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <input id={id} {...rest} className={cx(fieldBase, rest.className)} />
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, hint, id, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; id: string }) {
  return (
    <label htmlFor={id} className="block space-y-1">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <textarea id={id} {...rest} className={cx(fieldBase, "min-h-24", rest.className)} />
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Select({ label, id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string }) {
  return (
    <label htmlFor={id} className="block space-y-1">
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <select id={id} {...rest} className={cx(fieldBase, "appearance-none", rest.className)}>{children}</select>
    </label>
  );
}

/** Typing indicator: three ink dots. */
export function InkDots({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted" role="status">
      <span className="inline-flex gap-1" aria-hidden>
        <span className="ink-dot size-1.5 rounded-full bg-dye" />
        <span className="ink-dot size-1.5 rounded-full bg-dye" />
        <span className="ink-dot size-1.5 rounded-full bg-dye" />
      </span>
      {label}
    </span>
  );
}

export type ChannelKind = "web" | "whatsapp" | "messenger" | "instagram";

export const CHANNEL_LABEL: Record<ChannelKind, string> = {
  web: "Web chat",
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  instagram: "Instagram",
};

/**
 * Oja's own monoline glyphs for each channel. Deliberately NOT the Meta logos:
 * the hackathon rules forbid third-party trademarks without permission.
 */
export function ChannelGlyph({ kind, className = "size-4" }: { kind: ChannelKind; className?: string }) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (kind) {
    case "web":
      return <svg {...common}><rect x="3" y="4" width="18" height="13" /><path d="M8 21h8M12 17v4" /><path d="M7 9h6M7 12h10" /></svg>;
    case "whatsapp":
      return <svg {...common}><path d="M4 20l1.3-4A8 8 0 1 1 8.5 19z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5" /></svg>;
    case "messenger":
      return <svg {...common}><path d="M12 3C7 3 3 6.6 3 11c0 2.4 1.2 4.6 3 6v4l3.5-2c.8.2 1.6.3 2.5.3 5 0 9-3.6 9-8.3S17 3 12 3z" /><path d="M7.5 13l3-3 2.5 2 3.5-3" /></svg>;
    case "instagram":
      return <svg {...common}><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><circle cx="12" cy="12" r="4" /><path d="M17 7h.01" /></svg>;
  }
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="adire-dots flex flex-col items-center justify-center gap-2 border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="font-display text-2xl text-strong">{title}</p>
      <p className="max-w-sm text-sm text-muted">{body}</p>
      {children}
    </div>
  );
}
