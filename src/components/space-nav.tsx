"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronRight, Hash, Lock, Megaphone } from "lucide-react";
import { useT } from "@/components/i18n-provider";

export interface SpaceLink {
  slug: string;
  name: string;
  group: string;
  readOnly: boolean;
  cohortOnly: boolean;
  pinned: boolean;
  unread: number;
}

export function SpaceNav({ spaces }: { spaces: SpaceLink[] }) {
  const t = useT();
  const pathname = usePathname();
  // Spaces opened since the layout rendered: their counts are stale, so hide them.
  const current = spaces.find((s) => pathname.startsWith(`/community/${s.slug}`))?.slug;
  const [seen, setSeen] = useState<string[]>([]);
  if (current && !seen.includes(current)) setSeen([...seen, current]);
  const count = (s: SpaceLink) => (seen.includes(s.slug) ? 0 : s.unread);
  const more = spaces.filter((s) => !s.pinned);
  const moreOpen = more.some((s) => pathname.startsWith(`/community/${s.slug}`));

  return (
    <nav className="space-y-6">
      <Link
        href="/community"
        className={clsx(
          "block rounded-md px-3 py-2 text-sm font-medium",
          pathname === "/community" ? "bg-ink text-paper" : "hover:bg-line/60",
        )}
      >
        {t("community.latestActivity")}
      </Link>
      <Groups spaces={spaces.filter((s) => s.pinned)} pathname={pathname} count={count} />
      {more.length > 0 && (
        <details open={moreOpen || undefined} className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted hover:bg-line/60 hover:text-ink [&::-webkit-details-marker]:hidden">
            <ChevronRight
              size={14}
              className="transition-transform group-open:rotate-90 rtl:-scale-x-100 rtl:group-open:-rotate-90"
            />
            {t("community.moreSpaces", { count: more.length })}
            <UnreadBadge n={more.reduce((n, s) => n + count(s), 0)} />
          </summary>
          <div className="mt-4 space-y-6">
            <Groups spaces={more} pathname={pathname} count={count} />
          </div>
        </details>
      )}
    </nav>
  );
}

function UnreadBadge({ n }: { n: number }) {
  const t = useT();
  if (n <= 0) return null;
  return (
    <span className="ms-auto rounded-[4px] bg-accent px-1.5 font-mono text-[11px] font-semibold text-accent-ink">
      <span className="sr-only">{t("community.badgePrefix")}</span>
      {n > 99 ? "99+" : n}
      <span className="sr-only">{t("community.badgeSuffix")}</span>
    </span>
  );
}

function Groups({
  spaces,
  pathname,
  count,
}: {
  spaces: SpaceLink[];
  pathname: string;
  count: (s: SpaceLink) => number;
}) {
  const groups = [...new Set(spaces.map((s) => s.group))];
  // Cohort groups first: that's where students spend most of their time.
  groups.sort(
    (a, b) =>
      Number(spaces.some((s) => s.group === b && s.cohortOnly)) -
      Number(spaces.some((s) => s.group === a && s.cohortOnly)),
  );
  return groups.map((group) => (
    <div key={group}>
      <p className="mb-1.5 flex items-center gap-1.5 px-3 text-xs font-medium text-muted">
        {group}
        {spaces.some((s) => s.group === group && s.cohortOnly) && <Lock size={10} />}
      </p>
      <ul>
        {spaces
          .filter((s) => s.group === group)
          .map((s) => {
            const active = pathname.startsWith(`/community/${s.slug}`);
            const Icon = s.readOnly ? Megaphone : Hash;
            return (
              <li key={s.slug}>
                <Link
                  href={`/community/${s.slug}`}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
                    active ? "bg-ink text-paper" : "text-muted hover:bg-line/60 hover:text-ink",
                  )}
                >
                  <Icon size={14} /> {s.name}
                  <UnreadBadge n={count(s)} />
                </Link>
              </li>
            );
          })}
      </ul>
    </div>
  ));
}
