import "server-only";
import { cookies, headers } from "next/headers";
import { requestScope } from "@/lib/data/store";
import { getSessionUser } from "@/lib/session";
import { registerLocale } from "@/lib/time";
import { DEFAULT_LOCALE, dirOf, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { translator } from "./translate";

// The request's language: the toggle's cookie, else the signed-in person's
// saved choice, else the browser's preference, else English. Stored for the
// rest of the request so date formatting (src/lib/time.ts) follows it.

function fromAcceptLanguage(header: string | null): Locale | null {
  for (const part of (header ?? "").split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    if (tag.startsWith("ar")) return "ar";
    if (tag.startsWith("en")) return "en";
  }
  return null;
}

export async function getLocale(): Promise<Locale> {
  const scope = requestScope();
  if (scope.locale) return scope.locale;
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  let locale: Locale | null = isLocale(cookie) ? cookie : null;
  if (!locale) {
    const saved = (await getSessionUser())?.locale;
    locale = isLocale(saved) ? saved : fromAcceptLanguage((await headers()).get("accept-language"));
  }
  scope.locale = locale ?? DEFAULT_LOCALE;
  return scope.locale;
}

/** The request's language, and `t()` for it. Call before formatting dates in a page. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, dir: dirOf(locale), t: translator(locale) };
}

// Date formatting reads the language set above (sync, per request).
registerLocale(() => requestScope().locale ?? DEFAULT_LOCALE);
