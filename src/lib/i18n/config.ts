// Shared by server and client code (no server-only import).
import type { Locale } from "@/lib/types";

export type { Locale };
export const LOCALES: readonly Locale[] = ["en", "ar"];
export const DEFAULT_LOCALE: Locale = "en";
/** Remembers the toggle. Not HttpOnly-sensitive: it only holds "en" or "ar". */
export const LOCALE_COOKIE = "academe_lang";

export const isLocale = (v: unknown): v is Locale => v === "en" || v === "ar";
export const dirOf = (l: Locale) => (l === "ar" ? "rtl" : "ltr");

/** For Intl: British English; Arabic with Western digits (0-9), as agreed. */
export const intlLocale = (l: Locale) => (l === "ar" ? "ar-u-nu-latn" : "en-GB");

/** The language list in its own language, for the toggle. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ar: "العربية" };
