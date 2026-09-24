import { intlLocale, type Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/translate";
import { activeLocale } from "@/lib/time";

// Money and percentages, in the request's language unless one is given.

export const formatMoney = (cents: number, currency = "USD", locale: Locale = activeLocale()) =>
  new Intl.NumberFormat(locale === "en" ? "en-US" : intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);

export const formatPercent = (value: number | null, locale: Locale = activeLocale()) =>
  value === null ? translate(locale, "common.notAvailable") : `${value}%`;
