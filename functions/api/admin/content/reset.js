import { json } from '../../../../lib/util.js';
import { requireAuth } from '../../../../lib/auth.js';
export const onRequestPost = async ({ request, env }) => {
  await requireAuth(request, env);
  const { key } = await request.json().catch(() => ({}));
  if (key) await env.DB.prepare('DELETE FROM content WHERE key = ?').bind(key).run();
  else await env.DB.prepare('DELETE FROM content').run();
  return json({ ok: true });
};
