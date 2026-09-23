"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function Tabs({ base, items }: { base: string; items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 mb-8 flex [scrollbar-width:none] gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0 print:hidden">
      {items.map(({ href, label }) => {
        const full = href ? `${base}/${href}` : base;
        const active = href ? pathname.startsWith(full) : pathname === base;
        return (
          <Link
            key={label}
            href={full}
            className={clsx(
              "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors",
              active ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
