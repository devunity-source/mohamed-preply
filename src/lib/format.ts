import type { Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/translate";
import { activeLocale } from "@/lib/time";

// Percentages in the request's language unless one is given. Money always
// reads "$670": Arabic formatting gives "US$ 670", which flips to "$US 670"
// inside right-to-left text.

export const formatMoney = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);

export const formatPercent = (value: number | null, locale: Locale = activeLocale()) =>
  value === null ? translate(locale, "common.notAvailable") : `${value}%`;
