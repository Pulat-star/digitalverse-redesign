import { json } from '../../lib/util.js';
import { CONTENT_KEYS } from '../../lib/content.js';
export const onRequestGet = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT key, value FROM content').all();
  const out = {};
  (results || []).forEach((r) => { if (CONTENT_KEYS.has(r.key)) out[r.key] = r.value; });
  return json(out, 200, { 'Cache-Control': 'no-cache' });
};
