/* Password hashing and session cookies on Web Crypto — Workers have no bcrypt
   and no server-side session store, so the cookie itself is signed. */
import { readCookies } from './util.js';

const enc = new TextEncoder();
const COOKIE = 'dv_session';
const MAX_AGE = 7 * 24 * 60 * 60; // seconds
const ITERATIONS = 100000;

const toHex = (buf) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(bits)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  const salt = fromHex(parts[2]);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return timingSafeEqual(toHex(bits), parts[3]);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function secretOf(env) {
  const s = env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET sozlanmagan.');
  return s;
}

async function sign(value, env) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secretOf(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(value)));
}

export async function createSession(user, env) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const body = `${user.id}.${exp}`;
  const token = `${body}.${await sign(body, env)}`;
  const flags = `HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}; Secure`;
  return `${COOKIE}=${encodeURIComponent(token)}; ${flags}`;
}

export const clearSession = () =>
  `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Secure`;

/** Returns the signed-in admin row, or null. */
export async function currentUser(request, env) {
  const token = readCookies(request)[COOKIE];
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(exp)) return null;
  if (Number(exp) * 1000 < Date.now()) return null;
  if (!timingSafeEqual(await sign(`${id}.${exp}`, env), sig)) return null;
  return env.DB.prepare('SELECT id, username, password_hash FROM admin_users WHERE id = ?')
    .bind(Number(id)).first();
}

export async function requireAuth(request, env) {
  const user = await currentUser(request, env);
  if (!user) throw new Response(JSON.stringify({ error: 'Tizimga kirish talab qilinadi.' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } });
  return user;
}
