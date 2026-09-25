"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** j / k step through submissions when you're not typing in a field. */
export function GradingKeys({ prev, next }: { prev?: string; next?: string }) {
  const router = useRouter();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable=true]")) return;
      const href = e.key === "j" ? next : e.key === "k" ? prev : undefined;
      if (href) {
        e.preventDefault();
        router.push(href, { scroll: false });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);
  return null;
}
