import { json, fail, clamp } from '../../../../lib/util.js';
import { requireAuth } from '../../../../lib/auth.js';
import { STATUSES } from '../leads.js';

export const onRequestPatch = async ({ request, params, env }) => {
  await requireAuth(request, env);
  const row = await env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(Number(params.id)).first();
  if (!row) return fail('Topilmadi.', 404);
  const b = await request.json().catch(() => ({}));
  const status = STATUSES.includes(b.status) ? b.status : row.status;
  const note = b.note != null ? clamp(b.note, 4000) : row.note;
  await env.DB.prepare('UPDATE leads SET status = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(status, note, row.id).run();
  return json({ ok: true });
};

export const onRequestDelete = async ({ request, params, env }) => {
  await requireAuth(request, env);
  await env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(Number(params.id)).run();
  return json({ ok: true });
};
