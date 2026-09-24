// Look up and format a message. Shared by server and client.
import { formatMessage, type Vars } from "./format";
import { messages, type Key } from "./messages";
import type { Locale } from "./config";

export type { Key };

export function translate(locale: Locale, key: Key, vars?: Vars): string {
  const [ns, name] = key.split(".") as [string, string];
  const dict = messages[locale] as Record<string, Record<string, Parameters<typeof formatMessage>[0]>>;
  const message = dict[ns]?.[name] ?? (messages.en as typeof dict)[ns]?.[name];
  return message === undefined ? key : formatMessage(message, locale, vars);
}

export type T = (key: Key, vars?: Vars) => string;
export const translator =
  (locale: Locale): T =>
  (key, vars) =>
    translate(locale, key, vars);
