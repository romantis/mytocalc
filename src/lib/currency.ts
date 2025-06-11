export type CurrencyMeta = {
  label: string;
  narrow: string;
};
/** Currency codes supported by the calculator */
export type Currency = "UAH" | "EUR" | "USD" | "PLN" | "GBP" | "CNY";
const CURRENCIES: Currency[] = [
  "UAH",
  "EUR",
  "USD",
  "PLN",
  "GBP",
  "CNY",
] as const;

const displayNames = new Intl.DisplayNames(["uk-UA"], {
  type: "currency",
});

/** Metadata to drive UI selects / formatting without ad‑hoc switches */
export const CURRENCY_META: Record<Currency, CurrencyMeta> = CURRENCIES.reduce(
  (acc, cur) => {
    const narrow = getNarrowSymbol(cur);
    const name = displayNames.of(cur) ?? cur; // наприклад, "гривня"
    acc[cur] = {
      label: `${narrow} ${name} (${cur.toUpperCase()})`,
      narrow,
    };
    return acc;
  },
  {} as Record<Currency, CurrencyMeta>
);

/* -------------------------------------------------------------------------- */
/*                          Helper utility functions                          */
/* -------------------------------------------------------------------------- */
/** Cache Intl.NumberFormat per currency – avoids re‑instantiating on every tick */
const fmtCache = new Map<Currency, Intl.NumberFormat>();
export function getFormatter(cur: Currency) {
  if (!fmtCache.has(cur)) {
    fmtCache.set(
      cur,
      new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: cur,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 2,
      })
    );
  }
  return fmtCache.get(cur)!;
}

// Get the narrow symbol for a currency
function getNarrowSymbol(cur: Currency) {
  // Форматуємо 1 одиницю та вирізаємо цифру й роздільники
  const formatted = new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: cur,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(1);
  return formatted.replace(/[\d\s.,\/-]/g, "");
}

// Helper functions
/** Convert amount from one currency to another using provided rates */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number>
): number {
  if (from === to) return amount;
  const fromRate =
    from === "EUR" ? rates["EUR"] : from === "UAH" ? 1 : rates[from];
  const toRate = to === "EUR" ? rates["EUR"] : to === "UAH" ? 1 : rates[to];
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate)) return NaN;
  // amount → UAH → target
  return (amount * fromRate) / toRate;
}