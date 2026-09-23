"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Hash, Lock, Megaphone } from "lucide-react";

export interface SpaceLink {
  slug: string;
  name: string;
  group: string;
  readOnly: boolean;
  cohortOnly: boolean;
}

export function SpaceNav({ spaces }: { spaces: SpaceLink[] }) {
  const pathname = usePathname();
  const groups = [...new Set(spaces.map((s) => s.group))];
  // Cohort groups first: that's where students spend most of their time.
  groups.sort(
    (a, b) =>
      Number(spaces.some((s) => s.group === b && s.cohortOnly)) -
      Number(spaces.some((s) => s.group === a && s.cohortOnly)),
  );

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
      {groups.map((group) => (
        <div key={group}>
          <p className="mb-1.5 flex items-center gap-1.5 px-3 font-mono text-[11px] font-medium tracking-[0.12em] text-muted uppercase">
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
      ))}
    </nav>
  );
}
