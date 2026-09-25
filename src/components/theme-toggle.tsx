"use client";

import clsx from "clsx";
import { Moon, Sun } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

/** The mode the page is showing now: the saved choice, else the device's. */
function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Sun in dark mode (switch to light), moon in light mode (switch to dark).
 * Both icons are rendered and CSS shows the right one, so it's correct on
 * first paint even when the device decides. With `label`, the mode it
 * switches to is written out too.
 */
export function ThemeToggle({ className, label = false }: { className?: string; label?: boolean }) {
  const t = useT();
  const toggle = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("common.themeToggle")}
      title={t("common.themeToggle")}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium hover:bg-ink/5",
        className,
      )}
    >
      <Sun size={15} aria-hidden className="hidden dark:block" />
      <Moon size={15} aria-hidden className="dark:hidden" />
      {label && (
        <>
          <span className="hidden dark:inline">{t("common.lightMode")}</span>
          <span className="dark:hidden">{t("common.darkMode")}</span>
        </>
      )}
    </button>
  );
}
