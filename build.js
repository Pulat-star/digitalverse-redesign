/* Copies the static site into dist/ for Cloudflare Pages.
   Kept explicit so node_modules, functions and migrations never ship. */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const INCLUDE = ['index.html', 'assets', 'admin'];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const entry of INCLUDE) {
  const from = path.join(ROOT, entry);
  if (!fs.existsSync(from)) continue;
  fs.cpSync(from, path.join(OUT, entry), { recursive: true });
}
console.log('dist/ built:', INCLUDE.join(', '));
