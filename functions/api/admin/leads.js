import { json } from '../../../lib/util.js';
import { requireAuth } from '../../../lib/auth.js';

export const STATUSES = ['new', 'in_progress', 'won', 'lost'];
export const SOURCES = ['site', 'greatevent'];

export const onRequestGet = async ({ request, env }) => {
  await requireAuth(request, env);
  const params = new URL(request.url).searchParams;
  const status = params.get('status');
  const source = params.get('source');
  const where = [];
  const bind = [];
  if (STATUSES.includes(status)) { where.push('status = ?'); bind.push(status); }
  if (SOURCES.includes(source)) { where.push('source = ?'); bind.push(source); }
  const sql = 'SELECT * FROM leads' + (where.length ? ' WHERE ' + where.join(' AND ') : '') +
              ' ORDER BY created_at DESC';
  const { results } = await env.DB.prepare(sql).bind(...bind).all();

  // Holat bo'yicha hisob — tanlangan sayt ichida
  const scope = SOURCES.includes(source) ? ' WHERE source = ?' : '';
  const scopeBind = SOURCES.includes(source) ? [source] : [];
  const { results: grouped } = await env.DB
    .prepare('SELECT status, COUNT(*) AS n FROM leads' + scope + ' GROUP BY status')
    .bind(...scopeBind).all();
  const counts = {};
  STATUSES.forEach((s) => { counts[s] = 0; });
  (grouped || []).forEach((r) => { counts[r.status] = r.n; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // Sayt bo'yicha hisob — har doim to'liq (filtrdan qat'i nazar)
  const { results: bySource } = await env.DB
    .prepare("SELECT source, COUNT(*) AS n, SUM(status = 'new') AS fresh FROM leads GROUP BY source").all();
  const sources = {};
  const fresh = {};
  SOURCES.forEach((s) => { sources[s] = 0; fresh[s] = 0; });
  (bySource || []).forEach((r) => {
    const key = SOURCES.includes(r.source) ? r.source : 'site';
    sources[key] = (sources[key] || 0) + r.n;
    fresh[key] = (fresh[key] || 0) + (r.fresh || 0);
  });
  const totalAll = Object.values(sources).reduce((a, b) => a + b, 0);
  const freshAll = Object.values(fresh).reduce((a, b) => a + b, 0);

  return json({ leads: results || [], counts, total, sources, fresh, totalAll, freshAll });
};
