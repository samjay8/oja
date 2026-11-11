"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

const TABS = [
  { href: "", label: "Inbox" },
  { href: "/catalog", label: "Catalog" },
  { href: "/channels", label: "Channels" },
  { href: "/settings", label: "Settings" },
] as const;

export function DeskNav() {
  const { slug } = useParams<{ slug: string }>();
  const path = usePathname();
  const base = `/vendor/${slug}`;
  const navRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  // One underline that glides to the active tab. Placed by direct style writes, so the
  // first placement is instant and later moves transition.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const bar = barRef.current;
    if (!nav || !bar) return;
    const place = () => {
      const a = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!a) {
        bar.style.opacity = "0";
        return;
      }
      bar.style.opacity = "1";
      bar.style.width = `${a.offsetWidth}px`;
      bar.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    place();
    if (!bar.dataset.ready) requestAnimationFrame(() => { bar.dataset.ready = "1"; });
    nav.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const ro = new ResizeObserver(place);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [path]);

  return (
    <nav ref={navRef} aria-label="Seller desk" className="relative -mb-px flex overflow-x-auto">
      {TABS.map((t) => {
        const href = base + t.href;
        const active = t.href === "" ? path === base || path === `${base}/` : path.startsWith(href);
        return (
          <Link
            key={t.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              "ease-ui inline-flex shrink-0 items-center border-b-2 border-transparent px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] max-sm:min-h-11 sm:px-4 " +
              (active ? "font-bold text-strong" : "text-muted hover:text-strong")
            }
          >
            {t.label}
          </Link>
        );
      })}
      <span
        ref={barRef}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-0 bg-dye opacity-0 motion-safe:data-[ready]:transition-[transform,width,opacity] data-[ready]:duration-[var(--dur-3)] data-[ready]:ease-[var(--ease-out)]"
      />
    </nav>
  );
}
