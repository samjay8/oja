"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Tag } from "@/components/ui";
import { LANGUAGE_CODES, LANGUAGES, type LanguageCode } from "@/lib/languages";

/** Buyer language picker: a small listbox popover. Escape closes and returns focus. */
export function LanguagePicker({ value, onChange, label }: { value: LanguageCode; onChange: (l: LanguageCode) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  function close(refocus: boolean) {
    setOpen(false);
    if (refocus) button.current?.focus();
  }

  function pick(l: LanguageCode) {
    onChange(l);
    close(true);
  }

  function onListKey(e: KeyboardEvent<HTMLUListElement>) {
    const items = Array.from(list.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => {
      e.preventDefault();
      items[(n + items.length) % items.length]?.focus();
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") close(false);
  }

  const current = LANGUAGES[value];
  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="ease-ui flex h-11 items-center gap-2 border border-line-strong bg-surface px-3 text-sm text-strong hover:border-dye hover:bg-wash aria-expanded:border-dye"
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
        <span lang={value} className="font-semibold">{current.native}</span>
        {current.beta && <Tag dashed>beta</Tag>}
        <svg aria-hidden viewBox="0 0 12 12" className={`size-3 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>
      <ul
        ref={list}
        id={id}
        role="listbox"
        aria-label={label}
        data-open={open}
        inert={!open}
        onKeyDown={onListKey}
        className="pop absolute right-0 top-full z-20 mt-1 max-h-[min(22rem,60svh)] w-60 overflow-y-auto border border-line-strong bg-surface py-1 shadow-[4px_4px_0_0_var(--line)]"
      >
        {LANGUAGE_CODES.map((c) => {
          const l = LANGUAGES[c];
          const selected = c === value;
          return (
            <li
              key={c}
              role="option"
              aria-selected={selected}
              tabIndex={-1}
              lang={c}
              onClick={() => pick(c)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pick(c);
                }
              }}
              className={`ease-ui flex min-h-11 cursor-pointer items-center gap-3 px-3 text-sm outline-offset-[-2px] hover:bg-wash focus-visible:bg-wash ${selected ? "font-semibold text-strong" : "text-text"}`}
            >
              <span aria-hidden className={`flex size-4 shrink-0 items-center justify-center border ${selected ? "border-dye bg-dye text-on-dye" : "border-line-strong"}`}>
                {selected && (
                  <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2.5 6.2 5 8.5l4.5-5" />
                  </svg>
                )}
              </span>
              <span className="min-w-0 flex-1">
                {l.native}
                {l.native !== l.label && <span lang="en" className="ml-1.5 text-xs font-normal text-muted">{l.label}</span>}
              </span>
              {l.beta && <Tag dashed>beta</Tag>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
