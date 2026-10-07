import { json, fail, clamp } from '../../lib/util.js';
import { hashPassword, createSession } from '../../lib/auth.js';
import { rateLimit, tooMany } from '../../lib/ratelimit.js';

export const onRequestPost = async ({ request, env }) => {
  const rl = await rateLimit(env, request, 'setup', 5, 3600);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_users').first();
  if ((row?.n || 0) > 0) return fail('Admin allaqachon mavjud.');
  const { username, password } = await request.json().catch(() => ({}));
  const u = clamp(username, 60);
  if (!u || !password || password.length < 8) return fail('Login va kamida 8 belgili parol kiriting.');
  const hash = await hashPassword(password);
  const res = await env.DB.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)')
    .bind(u, hash).run();
  const id = res.meta.last_row_id;
  return json({ ok: true, username: u }, 200, { 'Set-Cookie': await createSession({ id }, env) });
};
