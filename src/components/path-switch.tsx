"use client";

import { usePathname } from "next/navigation";

/**
 * Lets a server layout render different chrome per child route without
 * turning the whole layout into a client component. Both branches are
 * rendered on the server; this only picks one.
 */
export function AtPath({ path, match, other }: { path: string; match: React.ReactNode; other: React.ReactNode }) {
  return usePathname() === path ? match : other;
}

export function HideUnder({ prefix, children }: { prefix: string; children: React.ReactNode }) {
  return usePathname().startsWith(prefix) ? null : children;
}
