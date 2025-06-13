/* ------------------------------------------------------------------ */
/*                     0. Типи й константи                            */
/* ------------------------------------------------------------------ */
export const SUPPORTED = ['UAH', 'EUR', 'USD', 'PLN', 'GBP', 'CNY'] as const;
export type Currency = typeof SUPPORTED[number];

export interface CurrencyMeta {
  narrow: string;        // «₴»
  name: string;          // «hryvnia»
  label: string;         // «₴ hryvnia (UAH)»
}

/* ------------------------------------------------------------------ */
/*                 1. Кешовані генератори під locale                  */
/* ------------------------------------------------------------------ */
const metaCache = new Map<string, Record<Currency, CurrencyMeta>>();

export function getCurrencyMeta(locale = 'uk-UA'): Record<Currency, CurrencyMeta> {
  if (metaCache.has(locale)) return metaCache.get(locale)!;

  const dn = new Intl.DisplayNames([locale], { type: 'currency' });
  const map = Object.fromEntries(
    SUPPORTED.map((cur) => {
      const narrow = getNarrowSymbol(cur, locale);
      const name = dn.of(cur) ?? cur;
      return [cur, { narrow, name, label: `${narrow} ${name} (${cur})` }];
    })
  ) as Record<Currency, CurrencyMeta>;

  metaCache.set(locale, map);
  return map;
}

/* ------------------------------------------------------------------ */
/*                    2. Форматер грошей                              */
/* ------------------------------------------------------------------ */
const fmtCache = new Map<string, Intl.NumberFormat>();

export function getMoneyFormatter(cur: Currency, locale = 'uk-UA') {
  const key = `${cur}|${locale}`;
  if (!fmtCache.has(key)) {
    fmtCache.set(
      key,
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: cur,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 2,
      })
    );
  }
  return fmtCache.get(key)!;
}

/* ------------------------------------------------------------------ */
/*                     3. Конвертація сум                             */
/* ------------------------------------------------------------------ */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<Currency, number>
): number {
  if (from === to) return amount;
  const toUAH = (val: number, cur: Currency) =>
    cur === 'UAH' ? val : val * rates[cur];
  const fromUAH = (val: number, cur: Currency) =>
    cur === 'UAH' ? val : val / rates[cur];
  return fromUAH(toUAH(amount, from), to);
}

/* ------------------------------------------------------------------ */
/*              4. Допоміжна narrow-символ функція                    */
/* ------------------------------------------------------------------ */
function getNarrowSymbol(cur: Currency, locale = 'uk-UA'): string {
  const sample = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: cur,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(1);
  return sample.replace(/[\d\s.,-]/g, '');
}
