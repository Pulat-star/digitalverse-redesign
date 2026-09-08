import { json } from '../../lib/util.js';
export const onRequestGet = async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT id, title, client, category, result, description, image_id, link FROM portfolio ' +
    'WHERE published = 1 ORDER BY sort_order, id DESC').all();
  return json((results || []).map((r) => ({
    ...r, image: r.image_id ? '/api/img/' + r.image_id : ''
  })), 200, { 'Cache-Control': 'no-cache' });
};
