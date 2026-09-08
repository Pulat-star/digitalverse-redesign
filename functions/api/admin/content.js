import { json } from '../../../lib/util.js';
import { requireAuth } from '../../../lib/auth.js';
import { CONTENT_META, CONTENT_KEYS, readDefaults } from '../../../lib/content.js';

export const onRequestGet = async ({ request, env }) => {
  await requireAuth(request, env);
  const defaults = await readDefaults(request);
  const { results } = await env.DB.prepare('SELECT key, value FROM content').all();
  const overrides = {};
  (results || []).forEach((r) => { overrides[r.key] = r.value; });
  return json(CONTENT_META.map(([key, group, label]) => ({
    key, group, label,
    value: overrides[key] !== undefined ? overrides[key] : (defaults[key] || ''),
    original: defaults[key] || '',
    edited: overrides[key] !== undefined
  })));
};

export const onRequestPut = async ({ request, env }) => {
  await requireAuth(request, env);
  const defaults = await readDefaults(request);
  const updates = await request.json().catch(() => ({}));
  const stmts = [];
  for (const [key, raw] of Object.entries(updates)) {
    if (!CONTENT_KEYS.has(key)) continue;
    const v = String(raw == null ? '' : raw).trim();
    // storing the untouched original would only add noise — drop it instead
    if (v === '' || v === (defaults[key] || '')) {
      stmts.push(env.DB.prepare('DELETE FROM content WHERE key = ?').bind(key));
    } else {
      stmts.push(env.DB.prepare(
        'INSERT INTO content (key, value, updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ' +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP'
      ).bind(key, v));
    }
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true });
};
