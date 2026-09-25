// Turns a message into text. Shared by server and client.
//
// A message is a string with {placeholders}, or a plural set chosen by
// {count}: Arabic has six plural forms (zero, one, two, few, many, other),
// English uses one and other. Missing forms fall back to "other".
import { intlLocale, type Locale } from "./config";

export interface Plural {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}
export type Message = string | Plural;
export type Vars = Record<string, string | number>;

const rules = new Map<Locale, Intl.PluralRules>();
function pluralRule(locale: Locale): Intl.PluralRules {
  let r = rules.get(locale);
  if (!r) rules.set(locale, (r = new Intl.PluralRules(intlLocale(locale))));
  return r;
}

export function formatMessage(message: Message, locale: Locale, vars: Vars = {}): string {
  let text: string;
  if (typeof message === "string") {
    text = message;
  } else {
    const n = Number(vars.count ?? 0);
    // Arabic uses "zero" for 0; English doesn't, so only use it when given.
    const form = n === 0 && message.zero !== undefined ? "zero" : pluralRule(locale).select(n);
    text = message[form as keyof Plural] ?? message.other;
  }
  return text.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(vars[name]) : whole));
}
