// src/lib/rates.ts
import fallbackRates from '../data/rates.fallback.json'; 

export interface Rate {
  cc: string; // 'USD', 'EUR', …
  rate: number;
}

/** --- runtime constants --- */
const LS_KEY_DATA = 'customscalc:rates';
const LS_KEY_TS = 'customscalc:rates:ts';
const TTL_MS = 24 * 60 * 60 * 1_000; // 24 h

/** Raw fetch без кешу (лишилось як було) */
export async function fetchRates(): Promise<Record<string, number>> {
  const res = await fetch('api/rates' );
  if (!res.ok) throw new Error(`NBU API responded ${res.status}`);
  const data: Rate[] = await res.json();
  return Object.fromEntries(data.map(({ cc, rate }) => [cc, rate]));
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
  if (cached) return cached;

  // 2. спроба отримати live-дані НБУ
  try {
    const fresh = await fetchRates();
    writeCache(fresh);
    return fresh;
  } catch {
    // 3. fallback на build-time JSON
    return Object.fromEntries(fallbackRates.map(({ cc, rate }) => [cc, rate])) as Record<string, number>;
  }
}
