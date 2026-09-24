"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Bell,
  BookOpen,
  CalendarDays,
  GraduationCap,
  House,
  MessagesSquare,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/components/i18n-provider";
import type { Key } from "@/lib/i18n/translate";

interface Item {
  href: string;
  label: Key;
  icon: LucideIcon;
  also?: string;
}

const ITEMS: Item[] = [
  { href: "/dashboard", label: "common.home", icon: House },
  { href: "/programmes", label: "common.programmes", icon: GraduationCap, also: "/cohorts" },
  { href: "/community", label: "common.community", icon: MessagesSquare },
  { href: "/calendar", label: "common.calendar", icon: CalendarDays },
  { href: "/resources", label: "common.resources", icon: BookOpen },
  { href: "/notifications", label: "common.notifications", icon: Bell },
  { href: "/profile", label: "common.profile", icon: UserRound },
];

const ADMIN_ITEM: Item = { href: "/admin", label: "common.admin", icon: ShieldCheck };

export function Nav({ unread, showAdmin }: { unread: number; showAdmin: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const items = showAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS;
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon, also }) => {
        const active = pathname.startsWith(href) || (also && pathname.startsWith(also));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active ? "bg-ink text-paper" : "text-muted hover:bg-line/60 hover:text-ink",
            )}
          >
            <Icon size={16} strokeWidth={2} />
            <span>{t(label)}</span>
            {href === "/notifications" && unread > 0 && (
              <span className="ms-auto rounded-[4px] bg-accent px-1.5 font-mono text-[11px] font-semibold text-accent-ink">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
