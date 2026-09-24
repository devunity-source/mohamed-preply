export const formatMoney = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);

export const formatPercent = (value: number | null) => (value === null ? "n/a" : `${value}%`);
