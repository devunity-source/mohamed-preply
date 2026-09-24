"use client";

import { usePathname, useRouter } from "next/navigation";

/** Jumps to the same admin tab in another cohort. Deeper pages (one assignment, one class) are cohort-specific, so we stop at the tab. */
export function CohortSwitcher({ current, cohorts }: { current: string; cohorts: { id: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const tab = pathname.split("/")[4] ?? "";

  return (
    <select
      aria-label="Switch cohort"
      value={current}
      onChange={(e) => router.push(`/admin/cohorts/${e.target.value}${tab ? `/${tab}` : ""}`)}
      className="max-w-full min-w-0 truncate rounded-md border border-line bg-surface py-1.5 pr-8 pl-3 text-lg font-semibold tracking-tight outline-none focus:border-ink"
    >
      {cohorts.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
