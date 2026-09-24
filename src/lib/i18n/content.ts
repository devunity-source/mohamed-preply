// Curriculum content in the reader's language: an item's `i18n[locale]`
// fields over its original ones. Anything not translated stays as written.
import { translate, type Key } from "./translate";
import type { Locale, Translations } from "@/lib/types";

export function loc<T extends { i18n?: Translations<object> }>(item: T, locale: Locale): T {
  const tr = item.i18n?.[locale] as Partial<T> | undefined;
  if (!tr) return item;
  const out = { ...item };
  for (const [k, v] of Object.entries(tr)) {
    if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
      (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** A notification in the reader's language (older ones without a template keep their stored text). */
export function notificationText(
  n: { text: string; template?: string | null; params?: Record<string, string | number> },
  locale: Locale,
): string {
  return n.template ? translate(locale, n.template as Key, n.params ?? {}) : n.text;
}
