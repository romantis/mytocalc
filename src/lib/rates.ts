// import fallbackRates from '../data/rates.fallback.json'; 
const SITE   =  (import.meta.env.MODE !== 'development') 
  ?  import.meta.env.SITE 
  : `http://localhost:${process.env.PORT ?? 4321}`;

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

/** --- runtime constants --- */
const LS_KEY_DATA = 'mytocalccalc:rates';
const LS_KEY_TS = 'mytocalccalc:rates:ts';
const TTL_MS = 24 * 60 * 60 * 1_000; // 24 h

/** --- network first with graceful fallback --- */
export async function fetchRates(): Promise<RatesResp> {
  const endpoint =
    typeof window === "undefined"
      ? new URL("/api/rates", SITE).toString()
      : "/api/rates";

  const res  = await fetch(endpoint);
  // якщо CDN/KV ще нічого не має, /api/rates може повернути `{}`.
  const json = await res.json();

  if (Array.isArray(json)) {
    console.log('Fetched from ENDPOINT');
  } else {
    console.log('Will Fetch From NBU')
  }
  const list: Rate[] = Array.isArray(json) ? json : await fetch( NBU_API_URL ).then(r => r.json());

  const rates =  Object.fromEntries(list.map(({ cc, rate }) => [cc, rate]));
  const asOf = list[0]?.exchangedate   // '16.06.2025'
  return {asOf, rates}
}

/** Спроба прочитати кеш ↴ */
function readCache(): RatesResp | null {
  try {
    if (typeof window === 'undefined') return null; // SSR
    const ts = Number(localStorage.getItem(LS_KEY_TS));
    if (!ts || Date.now() - ts > TTL_MS) return null;
    const json = localStorage.getItem(LS_KEY_DATA);
    return json ? (JSON.parse(json) as RatesResp) : null;
  } catch {
    return null; // private mode або quota exceeded
  }
}

/** Запис курсу в кеш ↴ */
function writeCache(rates: RatesResp): void {
  try {
    localStorage.setItem(LS_KEY_DATA, JSON.stringify(rates));
    localStorage.setItem(LS_KEY_TS, Date.now().toString());
  } catch {
    /* ignore quota / disabled storage */
  }
}

/**
 * Публічний entry-point для UI:
 * повертає курси з кешу, мережі або файлу-fallback.
 */
export async function getRates(): Promise<RatesResp | {error: string}> {
  // 1. спроба взяти валідний кеш
  const cached = readCache();
  if (cached) {
    console.log('From cache');
    return cached
  };

  // 2. спроба отримати live-дані НБУ
  try {
    const fresh = await fetchRates();
    writeCache(fresh);
    console.log('From /api/rates');
    return fresh;
  } catch (err) {
    console.error(err);
    return {error: 'Failed to fetch rates', };
  }
}