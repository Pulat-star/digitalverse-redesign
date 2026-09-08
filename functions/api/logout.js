import { json } from '../../lib/util.js';
import { clearSession } from '../../lib/auth.js';
export const onRequestPost = () => json({ ok: true }, 200, { 'Set-Cookie': clearSession() });
