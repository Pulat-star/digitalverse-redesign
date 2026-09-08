import { json } from '../../lib/util.js';
export const onRequestGet = async ({ env }) => {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_users').first();
  return json({ needsSetup: (row?.n || 0) === 0 });
};
