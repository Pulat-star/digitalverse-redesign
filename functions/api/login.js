import { json, fail, clamp } from '../../lib/util.js';
import { verifyPassword, createSession } from '../../lib/auth.js';
import { rateLimit, tooMany } from '../../lib/ratelimit.js';

export const onRequestPost = async ({ request, env }) => {
  // PBKDF2 ataylab sekin — cheklovsiz urinish ham parolni, ham Worker
  // protsessor vaqtini xavf ostiga qo'yadi.
  const rl = await rateLimit(env, request, 'login', 8, 600);
  if (!rl.ok) return tooMany(rl.retryAfter);

  const { username, password } = await request.json().catch(() => ({}));
  const user = await env.DB.prepare('SELECT * FROM admin_users WHERE username = ?')
    .bind(clamp(username, 60)).first();
  if (!user || !(await verifyPassword(password || '', user.password_hash))) {
    return fail('Login yoki parol noto‘g‘ri.', 401);
  }
  return json({ ok: true, username: user.username }, 200,
    { 'Set-Cookie': await createSession(user, env) });
};
