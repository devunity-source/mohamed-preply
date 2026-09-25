"use client";

import { createContext, useContext, useMemo } from "react";
import { translator, type T } from "@/lib/i18n/translate";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

// The request's language for client components. Server components use
// getI18n() from src/lib/i18n/server.ts instead.

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);

/** `t("namespace.key", vars)` in the current language. */
export function useT(): T {
  const locale = useLocale();
  return useMemo(() => translator(locale), [locale]);
}
