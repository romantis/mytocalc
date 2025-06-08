// import fallbackRates from '../data/rates.fallback.json'; 
const SITE   =  (import.meta.env.MODE !== 'development') 
  ?  import.meta.env.SITE 
  : `http://localhost:${process.env.PORT ?? 4321}`;


export interface Rate {
  cc: string; // 'USD', 'EUR', …
  rate: number;
}

/** --- runtime constants --- */
const LS_KEY_DATA = 'mytocalccalc:rates';
const LS_KEY_TS = 'mytocalccalc:rates:ts';
const TTL_MS = 24 * 60 * 60 * 1_000; // 24 h

/** --- network first with graceful fallback --- */
export async function fetchRates(): Promise<Record<string, number>> {
  const endpoint =
    typeof window === "undefined"
      ? new URL("/api/rates", SITE).toString()
      : "/api/rates";

  const res  = await fetch(endpoint);
  // якщо CDN/KV ще нічого не має, /api/rates може повернути `{}`.
  const json = await res.json();

  const list: Rate[] = Array.isArray(json) ? json : await fetch(
     "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json"
  ).then(r => r.json());

  return Object.fromEntries(list.map(({ cc, rate }) => [cc, rate]));
}

/** Спроба прочитати кеш ↴ */
function readCache(): Record<string, number> | null {
  try {
    if (typeof window === 'undefined') return null; // SSR
    const ts = Number(localStorage.getItem(LS_KEY_TS));
    if (!ts || Date.now() - ts > TTL_MS) return null;
    const json = localStorage.getItem(LS_KEY_DATA);
    return json ? (JSON.parse(json) as Record<string, number>) : null;
  } catch {
    return null; // private mode або quota exceeded
  }
}

/** Запис курсу в кеш ↴ */
function writeCache(rates: Record<string, number>): void {
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
export async function getRates(): Promise<Record<string, number>> {
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
    console.log('fallbackFetchFromNBU');
    return fallbackFetchFromNBU();
  }
}

async function fallbackFetchFromNBU() {
   const res = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json' );
  if (!res.ok) throw new Error(`NBU API responded ${res.status}`);
  const data: Rate[] = await res.json();
  return Object.fromEntries(data.map(({ cc, rate }) => [cc, rate]));
}