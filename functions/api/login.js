import { json, fail, clamp } from '../../lib/util.js';
import { verifyPassword, createSession } from '../../lib/auth.js';
export const onRequestPost = async ({ request, env }) => {
  const { username, password } = await request.json().catch(() => ({}));
  const user = await env.DB.prepare('SELECT * FROM admin_users WHERE username = ?')
    .bind(clamp(username, 60)).first();
  if (!user || !(await verifyPassword(password || '', user.password_hash))) {
    return fail('Login yoki parol noto‘g‘ri.', 401);
  }
  return json({ ok: true, username: user.username }, 200,
    { 'Set-Cookie': await createSession(user, env) });
};
