"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Languages } from "lucide-react";
import { setLocale } from "@/lib/i18n/actions";
import { useLocale, useT } from "@/components/i18n-provider";

/** Switches between English and Arabic. Shows the other language, in that language. */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const other = locale === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      disabled={pending}
      lang={other}
      aria-label={`${t("common.languageLabel")}: ${t("common.switchTo")}`}
      onClick={() =>
        start(async () => {
          await setLocale(other);
          router.refresh();
        })
      }
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-60",
        className,
      )}
    >
      <Languages size={15} aria-hidden />
      {t("common.switchTo")}
    </button>
  );
}
