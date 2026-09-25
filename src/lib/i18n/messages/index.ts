// Every message, by language and namespace. Each namespace lives in its own
// pair of files (en/<ns>.ts, ar/<ns>.ts). The Arabic file is typed against
// the English one, so a missing or extra key is a build error.
import type { Locale } from "../config";
import type { Message } from "../format";
import * as en from "./en";
import * as ar from "./ar";

export type Dict = typeof en;
/** Same namespaces and keys as English, any message values. */
export type Shape<T> = { [N in keyof T]: { [K in keyof T[N]]: Message } };

export const messages: Record<Locale, Shape<Dict>> = { en, ar: ar satisfies Shape<Dict> };

/** "namespace.key" for every message. */
export type Key = { [N in keyof Dict]: `${N & string}.${keyof Dict[N] & string}` }[keyof Dict];
