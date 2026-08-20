import fallbackRates from '../data/rates.fallback.json';
import { NBU_API_URL } from "astro:env/server";

export interface Rate {
  cc: string; // 'USD', 'EUR', …
  rate: number;
  exchangedate: string; // '16.06.2025'
}

export interface RatesResp {
  asOf: string; // '16.06.2025'
  rates: Record<string, number>; // { USD: 41.4466, EUR: 47.6926, … }
}

function parseRatesList(list: Rate[]): RatesResp {
  const rates = Object.fromEntries(list.map(({ cc, rate }) => [cc, rate]));
  const asOf = list[0]?.exchangedate || new Date().toLocaleDateString('uk-UA');
  return { asOf, rates };
}

export const FALLBACK_RATES: RatesResp = parseRatesList(fallbackRates as Rate[]);

/**
 * Публічний entry-point для SSR:
 * повертає курси з Cloudflare KV, live NBU API або вбудованого fallback-файлу.
 */
export async function getRates(runtime?: { env?: any; ctx?: any }): Promise<RatesResp> {
  // 1. Спроба прочитати з Cloudflare KV
  const kv = runtime?.env?.RATES_KV as KVNamespace | undefined;
  if (kv) {
    try {
      const kvData = await kv.get('rates');
      if (kvData) {
        const parsed = JSON.parse(kvData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parseRatesList(parsed);
        }
      }
    } catch (err) {
      console.warn('[rates] Failed to read from KV:', err);
    }
  }

  // 2. Спроба отримати live-дані з НБУ
  try {
    const url = NBU_API_URL || 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json';
    const res = await fetch(url, { cf: { cacheTtl: 3600 } } as RequestInit);
    if (res.ok) {
      const data: Rate[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        if (kv && runtime?.ctx?.waitUntil) {
          runtime.ctx.waitUntil(
            kv.put('rates', JSON.stringify(data), { expirationTtl: 86400 })
          );
        }
        return parseRatesList(data);
      }
    }
  } catch (err) {
    console.warn('[rates] Failed to fetch from NBU API:', err);
  }

  // 3. Fallback до локальних статичних курсів
  console.warn('[rates] Using fallback exchange rates');
  return FALLBACK_RATES;
}