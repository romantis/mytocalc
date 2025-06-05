export const prerender = false;

import type { APIRoute } from 'astro';

/* ---------------- CORS ---------------- */
const ALLOWED_ORIGINS = import.meta.env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim()).filter(Boolean);


/* ---------------- help-функції ---------------- */

function addHeaders(resp: Response, extra: Record<string, string>={}) {
  Object.entries(extra).forEach(([k, v]) => resp.headers.set(k, v));
  return resp;
}

/** Стандартний Web Crypto у Workers для швидкого weak-ETag */
async function computeEtag(str: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(str),
  );
  // до hex-рядка
  const hash = [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `W/"${hash}"`;      // W/ — weak validator
}

function getCorsHeaders(origin: string | null): Record<string, string> | undefined {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      // кешувати pre-flight 24 год 
      'Access-Control-Max-Age': '86400',
    };
  }
  return undefined; 
}

/* ------------- OPTIONS = pre-flight ------------- */
export const OPTIONS: APIRoute = ({ request }) =>
  new Response(null, {
    status: 204,
    headers: getCorsHeaders(request.headers.get('Origin')),
  });

/* ------------- GET = самі курси ------------- */
export const GET: APIRoute = async ({ request, locals, url }) => {
  const { env, ctx } = locals.runtime;
  const origin = request.headers.get('Origin');
  const cors = getCorsHeaders(origin);

  /* === ① Edge-cache === */
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  let resp = await cache.match(cacheKey);
  if (resp) {
    console.log('EDGE cache HIT');
    return addHeaders(resp, cors);
  }
  console.log('EDGE cache MISS → KV');

  /* === ② KV === */
  const body = (await env.RATES_KV.get('rates')) ?? '{}';
  console.log(`KV ${(body === '{}') ? 'MISS' : 'HIT'}`);

  /* === ③ ETag (weak)  === */
  const etag = await computeEtag(body);
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch === etag) {
    console.log('ETag match → 304');
    return addHeaders(new Response(null, { status: 304 }), cors);
  }

  /* === ④ Формуємо відповідь === */
  resp = new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      // Edge + браузер тримають по 24 год, після чого віддають stale і оновлюють у фоні
      'Cache-Control': 'public, s-maxage=86400, max-age=86400, stale-while-revalidate=86400',
      'ETag': etag,
      'Vary': 'Origin',              // щоб CDN кешував по-різному для різних Origin
      ...cors,
    },
  });

  /* === ⑤ Кладемо у Edge-cache асинхронно === */
  ctx.waitUntil(cache.put(cacheKey, resp.clone()));
  console.log('EDGE cache PUT, ETag', etag);

  return resp;
};


