"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function Tabs({ base, items }: { base: string; items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  const [fade, setFade] = useState({ left: false, right: false });

  // On narrow screens the row scrolls sideways. Fade whichever edge hides
  // more tabs so it's obvious there's more, and keep the active tab in view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setFade({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    const active = el.querySelector<HTMLElement>("[aria-current=page]");
    // Scroll only the row (scrollIntoView could also move the page vertically).
    if (
      active &&
      (active.offsetLeft < el.scrollLeft || active.offsetLeft + active.offsetWidth > el.scrollLeft + el.clientWidth)
    ) {
      el.scrollLeft = active.offsetLeft - 16;
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  const mask =
    fade.left && fade.right
      ? "[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]"
      : fade.right
        ? "[mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)]"
        : fade.left
          ? "[mask-image:linear-gradient(to_right,transparent,black_3rem)]"
          : undefined;

  return (
    <nav
      ref={ref}
      className={clsx(
        "relative -mx-4 mb-8 flex [scrollbar-width:none] gap-1 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0 print:hidden",
        mask,
      )}
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
