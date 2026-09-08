export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  });

export const fail = (message, status = 400) => json({ error: message }, status);

export function readCookies(request) {
  const raw = request.headers.get('Cookie') || '';
  const out = {};
  raw.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

export const clamp = (s, n) => String(s == null ? '' : s).slice(0, n).trim();
