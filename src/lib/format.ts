export const formatMoney = (cents: number, currency = "EUR") =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);

export const formatPercent = (value: number | null) => (value === null ? "n/a" : `${value}%`);
