import { json } from '../../../../lib/util.js';
import { requireAuth } from '../../../../lib/auth.js';
export const onRequestPost = async ({ request, env }) => {
  await requireAuth(request, env);
  const { ids } = await request.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length) return json({ ok: true });
  await env.DB.batch(ids.map((id, i) =>
    env.DB.prepare('UPDATE portfolio SET sort_order = ? WHERE id = ?').bind(i, Number(id))));
  return json({ ok: true });
};
