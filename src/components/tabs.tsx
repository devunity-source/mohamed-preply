"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useLocale } from "@/components/i18n-provider";

export function Tabs({ base, items }: { base: string; items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const rtl = useLocale() === "ar";
  const ref = useRef<HTMLElement>(null);
  const [fade, setFade] = useState({ start: false, end: false });

  // On narrow screens the row scrolls sideways. Fade whichever edge hides
  // more tabs so it's obvious there's more, and keep the active tab in view.
  // Right to left, scrollLeft runs from 0 down to negative values.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const scrolled = Math.abs(el.scrollLeft);
      setFade({ start: scrolled > 4, end: scrolled + el.clientWidth < el.scrollWidth - 4 });
    };
    const active = el.querySelector<HTMLElement>("[aria-current=page]");
    // Scroll only the row (scrollIntoView could also move the page vertically).
    if (active) {
      const a = active.getBoundingClientRect();
      const row = el.getBoundingClientRect();
      if (a.left < row.left || a.right > row.right) {
        el.scrollLeft += rtl ? a.right - row.right + 16 : a.left - row.left - 16;
      }
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname, rtl]);

  // Gradients run from the start edge to the end edge.
  const dir = rtl ? "to left" : "to right";
  const mask =
    fade.start && fade.end
      ? `linear-gradient(${dir},transparent,black 2rem,black calc(100% - 2rem),transparent)`
      : fade.end
        ? `linear-gradient(${dir},black calc(100% - 3rem),transparent)`
        : fade.start
          ? `linear-gradient(${dir},transparent,black 3rem)`
          : undefined;

  return (
    <nav
      ref={ref}
      className={clsx(
        "relative -mx-4 mb-8 flex [scrollbar-width:none] gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0 print:hidden",
      )}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
    >
      {items.map(({ href, label }) => {
        const full = href ? `${base}/${href}` : base;
        const active = href ? pathname.startsWith(full) : pathname === base;
        return (
          <Link
            key={label}
            href={full}
            aria-current={active ? "page" : undefined}
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
