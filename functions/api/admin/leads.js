import { json } from '../../../lib/util.js';
import { requireAuth } from '../../../lib/auth.js';

export const STATUSES = ['new', 'in_progress', 'won', 'lost'];

export const onRequestGet = async ({ request, env }) => {
  await requireAuth(request, env);
  const status = new URL(request.url).searchParams.get('status');
  const q = STATUSES.includes(status)
    ? env.DB.prepare('SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC').bind(status)
    : env.DB.prepare('SELECT * FROM leads ORDER BY created_at DESC');
  const { results } = await q.all();
  const { results: grouped } = await env.DB
    .prepare('SELECT status, COUNT(*) AS n FROM leads GROUP BY status').all();
  const counts = {};
  STATUSES.forEach((s) => { counts[s] = 0; });
  (grouped || []).forEach((r) => { counts[r.status] = r.n; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return json({ leads: results || [], counts, total });
};
