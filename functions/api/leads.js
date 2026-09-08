import { json, fail, clamp } from '../../lib/util.js';
export const onRequestPost = async ({ request, env }) => {
  const b = await request.json().catch(() => ({}));
  const name = clamp(b.name, 120);
  const phone = clamp(b.phone, 60);
  if (!name) return fail('Ismni kiriting.');
  if (!phone) return fail('Telefon raqamni kiriting.');
  const res = await env.DB.prepare(
    'INSERT INTO leads (name, phone, service, message) VALUES (?,?,?,?)'
  ).bind(name, phone, clamp(b.service, 120), clamp(b.message, 2000)).run();
  return json({ ok: true, id: res.meta.last_row_id });
};
