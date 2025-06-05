interface NbuRate {
  cc: string;    // валютний код, наприклад 'USD'
  rate: number;  // курс у гривнях
}

const TTL = 24 * 60 * 60; // 24h
const NBU_API_URL = 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json';


export default {
  async scheduled(_event: ScheduledEvent, env: Env) {
    const res = await fetch(NBU_API_URL);
    if (!res.ok) throw new Error(`NBU responded ${res.status}`);
    const data: NbuRate[] = await res.json();

    // одна операція запису / добу — безкоштовно на Free-плані :contentReference[oaicite:2]{index=2}
    await env.RATES_KV.put('rates', JSON.stringify(data), { expirationTtl: TTL + 3600 });
  }
};
