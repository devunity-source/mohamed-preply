"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronRight, Hash, Lock, Megaphone } from "lucide-react";

export interface SpaceLink {
  slug: string;
  name: string;
  group: string;
  readOnly: boolean;
  cohortOnly: boolean;
  pinned: boolean;
}

export function SpaceNav({ spaces }: { spaces: SpaceLink[] }) {
  const pathname = usePathname();
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
        Latest activity
      </Link>
      <Groups spaces={spaces.filter((s) => s.pinned)} pathname={pathname} />
      {more.length > 0 && (
        <details open={moreOpen || undefined} className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted hover:bg-line/60 hover:text-ink [&::-webkit-details-marker]:hidden">
            <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
            More spaces · {more.length}
          </summary>
          <div className="mt-4 space-y-6">
            <Groups spaces={more} pathname={pathname} />
          </div>
        </details>
      )}
    </nav>
  );
}

function Groups({ spaces, pathname }: { spaces: SpaceLink[]; pathname: string }) {
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
                </Link>
              </li>
            );
          })}
      </ul>
    </div>
  ));
}
