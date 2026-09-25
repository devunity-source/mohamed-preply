"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Bell,
  BookOpen,
  CalendarDays,
  GraduationCap,
  House,
  LogOut,
  Menu,
  MessagesSquare,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/lib/auth-actions";
import { SubmitButton } from "@/components/submit-button";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/components/i18n-provider";
import type { Key } from "@/lib/i18n/translate";

const MAIN: { href: string; label: Key; icon: LucideIcon; also?: string }[] = [
  { href: "/dashboard", label: "common.home", icon: House },
  { href: "/programmes", label: "common.learn", icon: GraduationCap, also: "/cohorts" },
  { href: "/community", label: "common.community", icon: MessagesSquare },
  { href: "/calendar", label: "common.calendar", icon: CalendarDays },
];

/** Phone navigation: four labelled destinations in thumb reach, everything else behind More. */
export function MobileNav({ unread, showAdmin }: { unread: number; showAdmin: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  // Navigating closes the sheet (derived during render, no effect needed).
  if (open && openedAt !== pathname) setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const more = [
    { href: "/resources", label: t("common.resources"), icon: BookOpen, badge: 0 },
    { href: "/notifications", label: t("common.notifications"), icon: Bell, badge: unread },
    { href: "/profile", label: t("common.profile"), icon: UserRound, badge: 0 },
    ...(showAdmin ? [{ href: "/admin", label: t("common.admin"), icon: ShieldCheck, badge: 0 }] : []),
  ];
  const inMore = more.some((m) => pathname.startsWith(m.href));

  return (
    <div className="md:hidden print:hidden">
      {open && (
        <>
          <button
            type="button"
            aria-label={t("common.closeMenu")}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-ink/30"
          />
          <div
            id="more-menu"
            className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 rounded-md border border-line bg-surface p-2 shadow-lg"
          >
            <ul>
              {more.map(({ href, label, icon: Icon, badge }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={clsx(
                      "flex items-center gap-3 rounded-md px-3 py-3 text-sm",
                      pathname.startsWith(href) ? "bg-violet/20 text-ink" : "hover:bg-line/60",
                    )}
                  >
                    <Icon size={18} /> {label}
                    {badge > 0 && (
                      <span className="ms-auto rounded-[4px] bg-accent px-1.5 font-mono text-[11px] font-semibold text-accent-ink">
                        {badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <form action={signOut} className="mt-1 border-t border-line pt-1">
              <SubmitButton
                unstyled
                className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm text-muted hover:bg-line/60 hover:text-ink"
              >
                <LogOut size={18} /> {t("common.signOut")}
              </SubmitButton>
            </form>
            <div className="mt-1 border-t border-line pt-1">
              <LanguageToggle className="w-full justify-start gap-3 px-3 py-3 text-muted hover:text-ink" />
            </div>
          </div>
        </>
      )}

      <nav
        aria-label={t("common.mainNav")}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        {MAIN.map(({ href, label, icon: Icon, also }) => {
          const active = pathname.startsWith(href) || (also && pathname.startsWith(also));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                active ? "font-medium text-ink" : "text-muted",
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {t(label)}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="more-menu"
          onClick={() => {
            setOpenedAt(pathname);
            setOpen((o) => !o);
          }}
          className={clsx(
            "relative flex flex-col items-center gap-1 py-2.5 text-[11px]",
            open || inMore ? "font-medium text-ink" : "text-muted",
          )}
        >
          {open ? <X size={20} /> : <Menu size={20} strokeWidth={inMore ? 2.5 : 2} />}
          {t("common.more")}
          {unread > 0 && !open && (
            <span className="absolute start-1/2 top-1.5 ms-2 size-2 rounded-full bg-accent" aria-hidden />
          )}
        </button>
      </nav>
    </div>
  );
}
