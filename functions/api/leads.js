import { json, fail, clamp } from '../../lib/util.js';
import { rateLimit, tooMany } from '../../lib/ratelimit.js';

export const onRequestPost = async ({ request, env }) => {
  // Bitta odam arizani bir marta yuboradi; 10 daqiqada 5 tadan ko'pi — bot.
  const rl = await rateLimit(env, request, 'leads', 5, 600);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const b = await request.json().catch(() => ({}));
  // Ko'rinmas maydon: foydalanuvchi uni to'ldira olmaydi, bot to'ldiradi.
  // Botga muvaffaqiyat deb javob beramiz — qayta urinmasin.
  if (clamp(b.company, 200)) return json({ ok: true });

  const name = clamp(b.name, 120);
  const phone = clamp(b.phone, 60);
  if (!name) return fail('Ismni kiriting.');
  if (!phone) return fail('Telefon raqamni kiriting.');
  const res = await env.DB.prepare(
    'INSERT INTO leads (name, phone, service, message) VALUES (?,?,?,?)'
  ).bind(name, phone, clamp(b.service, 120), clamp(b.message, 2000)).run();
  return json({ ok: true, id: res.meta.last_row_id });
};
