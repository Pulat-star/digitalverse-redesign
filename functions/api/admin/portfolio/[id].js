import { json, fail, clamp } from '../../../../lib/util.js';
import { requireAuth } from '../../../../lib/auth.js';
import { saveImage, deleteImage } from '../../../../lib/images.js';

export const onRequestPut = async ({ request, params, env }) => {
  await requireAuth(request, env);
  const row = await env.DB.prepare('SELECT * FROM portfolio WHERE id = ?').bind(Number(params.id)).first();
  if (!row) return fail('Topilmadi.', 404);
  const form = await request.formData();
  let imageId = row.image_id;
  const uploaded = await saveImage(env, form.get('image'));
  if (uploaded) { imageId = uploaded; await deleteImage(env, row.image_id); }
  const pick = (k, cur, max) => (form.has(k) ? clamp(form.get(k), max) : cur);
  await env.DB.prepare(
    'UPDATE portfolio SET title=?, client=?, category=?, result=?, description=?, image_id=?, link=?, published=? WHERE id=?'
  ).bind(pick('title', row.title, 200) || row.title, pick('client', row.client, 120),
         pick('category', row.category, 120), pick('result', row.result, 120),
         pick('description', row.description, 2000), imageId, pick('link', row.link, 500),
         form.get('published') === '0' ? 0 : 1, row.id).run();
  return json({ ok: true });
};

export const onRequestDelete = async ({ request, params, env }) => {
  await requireAuth(request, env);
  const row = await env.DB.prepare('SELECT * FROM portfolio WHERE id = ?').bind(Number(params.id)).first();
  if (!row) return fail('Topilmadi.', 404);
  await env.DB.prepare('DELETE FROM portfolio WHERE id = ?').bind(row.id).run();
  await deleteImage(env, row.image_id);
  return json({ ok: true });
};
