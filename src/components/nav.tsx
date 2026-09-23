"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Bell, BookOpen, CalendarDays, GraduationCap, House, MessagesSquare, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/programmes", label: "Programmes", icon: GraduationCap, also: "/cohorts" },
  { href: "/community", label: "Community", icon: MessagesSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/resources", label: "Resources", icon: BookOpen },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function Nav({ unread, orientation }: { unread: number; orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  return (
    <nav
      className={clsx(
        orientation === "vertical"
          ? "flex flex-col gap-0.5"
          : "flex [scrollbar-width:none] gap-1 overflow-x-auto px-4 pb-3",
      )}
    >
      {ITEMS.map(({ href, label, icon: Icon, also }) => {
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
            <span className={orientation === "horizontal" ? "hidden sm:inline" : undefined}>{label}</span>
            {href === "/notifications" && unread > 0 && (
              <span className="ml-auto rounded-[4px] bg-accent px-1.5 font-mono text-[11px] font-semibold text-accent-ink">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
