"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

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
  return (
    <nav aria-label="Seller desk" className="-mb-px flex overflow-x-auto">
      {TABS.map((t) => {
        const href = base + t.href;
        const active = t.href === "" ? path === base || path === `${base}/` : path.startsWith(href);
        return (
          <Link
            key={t.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              "shrink-0 border-b-2 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] sm:px-4 " +
              (active ? "border-dye font-bold text-strong" : "border-transparent text-muted hover:text-strong")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
