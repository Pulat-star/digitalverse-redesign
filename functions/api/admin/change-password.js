import { json, fail } from '../../../lib/util.js';
import { requireAuth, verifyPassword, hashPassword } from '../../../lib/auth.js';
export const onRequestPost = async ({ request, env }) => {
  const user = await requireAuth(request, env);
  const { currentPassword, newPassword } = await request.json().catch(() => ({}));
  if (!(await verifyPassword(currentPassword || '', user.password_hash))) {
    return fail('Joriy parol noto‘g‘ri.', 401);
  }
  if (!newPassword || newPassword.length < 8) {
    return fail('Yangi parol kamida 8 belgidan iborat bo‘lishi kerak.');
  }
  await env.DB.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?')
    .bind(await hashPassword(newPassword), user.id).run();
  return json({ ok: true });
};
