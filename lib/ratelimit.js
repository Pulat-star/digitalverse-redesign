/* IP bo'yicha so'rov cheklovi.
   Cloudflare DDoS'ni o'zi to'xtatadi, lekin u "haqiqiy ko'rinadigan" so'rovlarni
   o'tkazadi — CRM'ni soxta arizalar bilan to'ldirish yoki parolni brute-force
   qilish uchun shu yetarli. Shuning uchun ariza va kirish yo'llari alohida
   cheklanadi. Hisoblagich D1 da: bitta UPSERT, qo'shimcha xizmat kerak emas. */

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP')
      || request.headers.get('X-Forwarded-For')?.split(',')[0].trim()
      || '0.0.0.0';
}

/**
 * @returns {Promise<{ok: boolean, retryAfter: number}>}
 */
export async function rateLimit(env, request, name, limit, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const win = Math.floor(now / windowSec);
  const key = `${name}:${clientIp(request)}:${win}`;
  const exp = (win + 1) * windowSec;

  try {
    const row = await env.DB.prepare(
      'INSERT INTO rate_limits (k, n, exp) VALUES (?, 1, ?) ' +
      'ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n'
    ).bind(key, exp).first();

    // eskirgan yozuvlarni vaqti-vaqti bilan tozalab turamiz
    if (Math.random() < 0.02) {
      await env.DB.prepare('DELETE FROM rate_limits WHERE exp < ?').bind(now).run();
    }
    const n = row?.n || 1;
    return { ok: n <= limit, retryAfter: Math.max(1, exp - now) };
  } catch (e) {
    // Hisoblagich ishlamay qolsa saytni to'xtatmaymiz — so'rov o'tadi.
    return { ok: true, retryAfter: 0 };
  }
}

export function tooMany(retryAfter) {
  return new Response(
    JSON.stringify({ error: 'Juda ko‘p so‘rov. Birozdan so‘ng qayta urining.' }),
    { status: 429, headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(retryAfter)
    } });
}
