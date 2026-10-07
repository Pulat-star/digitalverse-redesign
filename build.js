/* Statik saytni dist/ ga yig'adi (Cloudflare Pages uchun).
   Ro'yxat aniq yozilgan — node_modules, functions va migrations hech qachon
   chiqmaydi. Shu yerda _headers ham hosil qilinadi: CSP ichidagi hash'lar
   index.html dagi inline skriptlardan olinadi, shunda ular hech qachon
   bir-biridan ajralib qolmaydi. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const INCLUDE = ['index.html', 'assets', 'admin', '_redirects'];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const entry of INCLUDE) {
  const from = path.join(ROOT, entry);
  if (!fs.existsSync(from)) continue;
  fs.cpSync(from, path.join(OUT, entry), { recursive: true });
}

/* ---- CSP: inline skriptlar uchun sha256 hash ---------------------------- */
const hashes = new Set();
for (const page of ['index.html', path.join('admin', 'index.html')]) {
  const file = path.join(OUT, page);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    hashes.add("'sha256-" + crypto.createHash('sha256').update(m[1], 'utf8').digest('base64') + "'");
  }
}

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data:",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' " + [...hashes].join(' '),
  "connect-src 'self'",
  'upgrade-insecure-requests'
].join('; ');

const headers = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: ${csp}

# Boshqaruv paneli qidiruvga tushmasin va keshlanmasin
/admin/*
  X-Robots-Tag: noindex, nofollow
  Cache-Control: no-store

/api/*
  X-Robots-Tag: noindex, nofollow
  Cache-Control: no-store
`;
fs.writeFileSync(path.join(OUT, '_headers'), headers);

console.log('dist/ built:', INCLUDE.join(', '), '+ _headers (CSP hash:', hashes.size + ')');
