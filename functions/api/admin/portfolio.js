import { json, fail, clamp } from '../../../lib/util.js';
import { requireAuth } from '../../../lib/auth.js';
import { saveImage } from '../../../lib/images.js';

export const onRequestGet = async ({ request, env }) => {
  await requireAuth(request, env);
  const { results } = await env.DB.prepare('SELECT * FROM portfolio ORDER BY sort_order, id DESC').all();
  return json((results || []).map((r) => ({ ...r, image: r.image_id ? '/api/img/' + r.image_id : '' })));
};

export const onRequestPost = async ({ request, env }) => {
  await requireAuth(request, env);
  const form = await request.formData();
  const title = clamp(form.get('title'), 200);
  if (!title) return fail('Sarlavhani kiriting.');
  const imageId = await saveImage(env, form.get('image'));
  const row = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM portfolio').first();
  const res = await env.DB.prepare(
    'INSERT INTO portfolio (title, client, category, result, description, image_id, link, sort_order, published) ' +
    'VALUES (?,?,?,?,?,?,?,?,?)'
  ).bind(title, clamp(form.get('client'), 120), clamp(form.get('category'), 120),
         clamp(form.get('result'), 120), clamp(form.get('description'), 2000),
         imageId, clamp(form.get('link'), 500), (row?.m ?? -1) + 1,
         form.get('published') === '0' ? 0 : 1).run();
  return json({ ok: true, id: res.meta.last_row_id });
};
