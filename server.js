/* =============================================================================
   DIGITALVERSE — site server, admin panel and CRM
   Express + SQLite. No build step; the public site stays a plain static page
   that also works without this server (e.g. on GitHub Pages), because every
   editable string keeps its original text in index.html and the CMS only
   ships overrides.
   ========================================================================== */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const Database = require('better-sqlite3');

const ROOT = __dirname;
// STORAGE_DIR points at a persistent volume in hosted environments (Railway).
// Locally it defaults to the project folder itself.
const STORAGE_DIR = process.env.STORAGE_DIR || ROOT;
const DATA_DIR = path.join(STORAGE_DIR, 'data');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/* ------------------------------------------------------- session secret */
const SECRET_FILE = path.join(DATA_DIR, 'session-secret.txt');
let SESSION_SECRET;
if (fs.existsSync(SECRET_FILE)) {
  SESSION_SECRET = fs.readFileSync(SECRET_FILE, 'utf8').trim();
} else {
  SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, SESSION_SECRET, { mode: 0o600 });
}

/* ------------------------------------------------------------- database */
const db = new Database(path.join(DATA_DIR, 'digitalverse.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  /* Only overrides live here. The default text stays in index.html, so an
     empty table means the site renders exactly as authored. */
  CREATE TABLE IF NOT EXISTS content (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    client TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    result TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    note TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'site',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_portfolio_sort ON portfolio(sort_order);
`);

/* ---------------------------------------------------- editable text map
   The key is written into index.html as data-cms="…". The label and group
   are only used to build the admin form. Adding a field means adding the
   attribute in the HTML and one line here. */
const CONTENT_META = [
  ['hero.line1',       'Hero', 'Sarlavha, 1-qator'],
  ['hero.line2a',      'Hero', 'Sarlavha, 2-qator (chap)'],
  ['hero.line2b',      'Hero', 'Sarlavha, 2-qator (qizil)'],
  ['hero.sub',         'Hero', 'Hero matni'],
  ['hero.cta',         'Hero', 'Tugma matni'],
  ['hero.place',       'Hero', 'Ofis qatori'],
  ['hero.stat1.value', 'Hero', '1-raqam'],
  ['hero.stat1.label', 'Hero', '1-raqam izohi'],
  ['hero.stat2.value', 'Hero', '2-raqam'],
  ['hero.stat2.label', 'Hero', '2-raqam izohi'],
  ['hero.stat3.value', 'Hero', '3-raqam'],
  ['hero.stat3.label', 'Hero', '3-raqam izohi'],

  ['pointa.eyebrow',   'Точка А', 'Bo‘lim yorlig‘i'],
  ['pointa.pain1',     'Точка А', '1-muammo'],
  ['pointa.pain2',     'Точка А', '2-muammo'],
  ['pointa.pain3',     'Точка А', '3-muammo'],
  ['pointa.pain4',     'Точка А', '4-muammo'],
  ['pointa.pain5',     'Точка А', '5-muammo'],
  ['pointa.out',       'Точка А', 'Yakuniy jumla'],

  ['eco.eyebrow',      'Ekosistema', 'Bo‘lim yorlig‘i'],
  ['eco.title',        'Ekosistema', 'Sarlavha'],
  ['eco.lede',         'Ekosistema', 'Kirish matni'],
  ['eco.p1.desc',      'Ekosistema', 'Digital Marketing tavsifi'],
  ['eco.p2.desc',      'Ekosistema', 'Great Event tavsifi'],
  ['eco.p3.desc',      'Ekosistema', 'Growin tavsifi'],
  ['eco.p4.desc',      'Ekosistema', 'Dzyn Group tavsifi'],
  ['eco.p5.desc',      'Ekosistema', 'Sotuv Bo‘limi tavsifi'],

  ['about.eyebrow',    'Biz haqimizda', 'Bo‘lim yorlig‘i'],
  ['about.title',      'Biz haqimizda', 'Sarlavha'],
  ['fact1.value',      'Biz haqimizda', '1-fakt raqami'],
  ['fact1.label',      'Biz haqimizda', '1-fakt izohi'],
  ['fact2.value',      'Biz haqimizda', '2-fakt raqami'],
  ['fact2.label',      'Biz haqimizda', '2-fakt izohi'],
  ['fact3.value',      'Biz haqimizda', '3-fakt raqami'],
  ['fact3.label',      'Biz haqimizda', '3-fakt izohi'],
  ['fact4.label',      'Biz haqimizda', '4-fakt izohi'],

  ['portfolio.eyebrow','Portfolio', 'Bo‘lim yorlig‘i'],
  ['portfolio.title',  'Portfolio', 'Sarlavha'],
  ['portfolio.works',  'Portfolio', 'Ishlar bloki sarlavhasi'],

  ['cases.eyebrow',    'Keyslar', 'Bo‘lim yorlig‘i'],
  ['cases.title',      'Keyslar', 'Sarlavha'],

  ['smm.eyebrow',      'SMM', 'Bo‘lim yorlig‘i'],
  ['smm.title',        'SMM', 'Sarlavha'],
  ['smm.c1.title',     'SMM', '1-blok sarlavhasi'],
  ['smm.c1.text',      'SMM', '1-blok matni'],
  ['smm.c2.title',     'SMM', '2-blok sarlavhasi'],
  ['smm.c2.text',      'SMM', '2-blok matni'],
  ['smm.c3.title',     'SMM', '3-blok sarlavhasi'],
  ['smm.c3.text',      'SMM', '3-blok matni'],

  ['trust.title',      'Mijozlar', 'Sarlavha'],

  ['cta.eyebrow',      'Ariza', 'Bo‘lim yorlig‘i'],
  ['cta.title',        'Ariza', 'Sarlavha'],
  ['cta.lede',         'Ariza', 'Matn'],
  ['cta.point1',       'Ariza', '1-va’da'],
  ['cta.point2',       'Ariza', '2-va’da'],
  ['cta.point3',       'Ariza', '3-va’da'],
  ['cta.button',       'Ariza', 'Tugma matni'],

  ['foot.big',         'Footer', 'Katta sarlavha'],
  ['foot.about',       'Footer', 'Qisqa tavsif'],
  ['contact.phone',    'Kontaktlar', 'Telefon'],
  ['contact.email',    'Kontaktlar', 'Email'],
  ['contact.address',  'Kontaktlar', 'Manzil']
];
const CONTENT_KEYS = new Set(CONTENT_META.map((m) => m[0]));

/* Defaults are read straight out of index.html so the admin form shows the
   real current copy without maintaining a second copy of it here. */
function readDefaults() {
  const out = {};
  let html = '';
  try { html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); } catch (e) { return out; }
  const re = /data-cms="([^"]+)"[^>]*>([\s\S]*?)</g;
  let m;
  while ((m = re.exec(html))) {
    const key = m[1];
    if (!CONTENT_KEYS.has(key) || out[key] !== undefined) continue;
    out[key] = m[2].replace(/\s+/g, ' ').trim();
  }
  return out;
}
const DEFAULTS = readDefaults();

/* ------------------------------------------------------------ app setup */
const app = express();
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) app.set('trust proxy', 1); // secure cookies behind Railway's proxy

app.use(express.json({ limit: '1mb' }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Tizimga kirish talab qilinadi.' });
}

/* ----------------------------------------------------------------- auth */
app.get('/api/setup-status', (req, res) => {
  const n = db.prepare('SELECT COUNT(*) AS n FROM admin_users').get().n;
  res.json({ needsSetup: n === 0 });
});

app.post('/api/setup', (req, res) => {
  const n = db.prepare('SELECT COUNT(*) AS n FROM admin_users').get().n;
  if (n > 0) return res.status(400).json({ error: 'Admin allaqachon mavjud.' });
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 8) {
    return res.status(400).json({ error: 'Login va kamida 8 belgili parol kiriting.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);
  req.session.userId = info.lastInsertRowid;
  req.session.username = username;
  res.json({ ok: true, username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username || '');
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Login yoki parol noto‘g‘ri.' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ ok: true, username: user.username });
});

app.post('/api/logout', (req, res) => { req.session.destroy(() => res.json({ ok: true })); });

app.get('/api/session', (req, res) => {
  if (req.session && req.session.userId) return res.json({ loggedIn: true, username: req.session.username });
  res.json({ loggedIn: false });
});

app.post('/api/admin/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.session.userId);
  if (!user || !bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(401).json({ error: 'Joriy parol noto‘g‘ri.' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Yangi parol kamida 8 belgidan iborat bo‘lishi kerak.' });
  }
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), user.id);
  res.json({ ok: true });
});

/* -------------------------------------------------------- image uploads */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, 'w-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
    }
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype);
    cb(ok ? null : new Error('Faqat rasm fayllari (jpg, png, webp, gif) qabul qilinadi.'), ok);
  }
});

/* ------------------------------------------------------ public read API */
app.get('/api/content', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM content').all();
  const out = {};
  rows.forEach((r) => { if (CONTENT_KEYS.has(r.key)) out[r.key] = r.value; });
  res.json(out);
});

app.get('/api/portfolio', (req, res) => {
  res.json(db.prepare('SELECT id, title, client, category, result, description, image, link FROM portfolio WHERE published = 1 ORDER BY sort_order, id DESC').all());
});

app.post('/api/leads', (req, res) => {
  const { name, phone, service, message } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Ismni kiriting.' });
  if (!phone || !String(phone).trim()) return res.status(400).json({ error: 'Telefon raqamni kiriting.' });
  const info = db.prepare(
    'INSERT INTO leads (name, phone, service, message) VALUES (?,?,?,?)'
  ).run(String(name).slice(0, 120).trim(), String(phone).slice(0, 60).trim(),
        String(service || '').slice(0, 120), String(message || '').slice(0, 2000));
  res.json({ ok: true, id: info.lastInsertRowid });
});

/* ------------------------------------------------------------ admin API */
app.get('/api/admin/content', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM content').all();
  const overrides = {};
  rows.forEach((r) => { overrides[r.key] = r.value; });
  res.json(CONTENT_META.map(([key, group, label]) => ({
    key, group, label,
    value: overrides[key] !== undefined ? overrides[key] : (DEFAULTS[key] || ''),
    original: DEFAULTS[key] || '',
    edited: overrides[key] !== undefined
  })));
});

app.put('/api/admin/content', requireAuth, (req, res) => {
  const updates = req.body || {};
  const set = db.prepare('INSERT INTO content (key, value, updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ' +
                         'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP');
  const del = db.prepare('DELETE FROM content WHERE key = ?');
  const run = db.transaction((entries) => {
    entries.forEach(([key, value]) => {
      if (!CONTENT_KEYS.has(key)) return;
      const v = String(value == null ? '' : value).trim();
      // storing the untouched original would only add noise — drop it instead
      if (v === '' || v === (DEFAULTS[key] || '')) del.run(key);
      else set.run(key, v);
    });
  });
  run(Object.entries(updates));
  res.json({ ok: true });
});

app.post('/api/admin/content/reset', requireAuth, (req, res) => {
  const { key } = req.body || {};
  if (key) db.prepare('DELETE FROM content WHERE key = ?').run(key);
  else db.prepare('DELETE FROM content').run();
  res.json({ ok: true });
});

app.get('/api/admin/portfolio', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM portfolio ORDER BY sort_order, id DESC').all());
});

app.post('/api/admin/portfolio', requireAuth, upload.single('image'), (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.title.trim()) return res.status(400).json({ error: 'Sarlavhani kiriting.' });
  const image = req.file ? '/uploads/' + req.file.filename : (b.image || '');
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM portfolio').get().m;
  const info = db.prepare(
    'INSERT INTO portfolio (title, client, category, result, description, image, link, sort_order, published) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(b.title.trim(), b.client || '', b.category || '', b.result || '', b.description || '',
        image, b.link || '', max + 1, b.published === '0' ? 0 : 1);
  res.json({ ok: true, id: info.lastInsertRowid });
});

app.put('/api/admin/portfolio/:id', requireAuth, upload.single('image'), (req, res) => {
  const row = db.prepare('SELECT * FROM portfolio WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Topilmadi.' });
  const b = req.body || {};
  let image = row.image;
  if (req.file) {
    image = '/uploads/' + req.file.filename;
    removeUpload(row.image);
  }
  db.prepare('UPDATE portfolio SET title=?, client=?, category=?, result=?, description=?, image=?, link=?, published=? WHERE id=?')
    .run(b.title != null ? b.title.trim() : row.title, b.client ?? row.client, b.category ?? row.category,
         b.result ?? row.result, b.description ?? row.description, image, b.link ?? row.link,
         b.published === '0' ? 0 : 1, row.id);
  res.json({ ok: true });
});

app.delete('/api/admin/portfolio/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM portfolio WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Topilmadi.' });
  db.prepare('DELETE FROM portfolio WHERE id = ?').run(row.id);
  removeUpload(row.image);
  res.json({ ok: true });
});

app.post('/api/admin/portfolio/reorder', requireAuth, (req, res) => {
  const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : [];
  const upd = db.prepare('UPDATE portfolio SET sort_order = ? WHERE id = ?');
  db.transaction(() => ids.forEach((id, i) => upd.run(i, id)))();
  res.json({ ok: true });
});

// only delete files we generated, never anything shipped with the repo
function removeUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const base = path.basename(url);
  const file = path.join(UPLOADS_DIR, base);
  if (path.dirname(file) !== UPLOADS_DIR) return;
  fs.promises.unlink(file).catch(() => {});
}

const LEAD_STATUSES = ['new', 'in_progress', 'won', 'lost'];

app.get('/api/admin/leads', requireAuth, (req, res) => {
  const status = req.query.status;
  const rows = LEAD_STATUSES.includes(status)
    ? db.prepare('SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC').all(status)
    : db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  const counts = {};
  LEAD_STATUSES.forEach((s) => {
    counts[s] = db.prepare('SELECT COUNT(*) AS n FROM leads WHERE status = ?').get(s).n;
  });
  res.json({ leads: rows, counts, total: db.prepare('SELECT COUNT(*) AS n FROM leads').get().n });
});

app.patch('/api/admin/leads/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Topilmadi.' });
  const b = req.body || {};
  const status = LEAD_STATUSES.includes(b.status) ? b.status : row.status;
  const note = b.note != null ? String(b.note).slice(0, 4000) : row.note;
  db.prepare('UPDATE leads SET status = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, note, row.id);
  res.json({ ok: true });
});

app.delete('/api/admin/leads/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/leads.csv', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT id, created_at, name, phone, service, status, note, message FROM leads ORDER BY created_at DESC').all();
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const head = ['id', 'sana', 'ism', 'telefon', 'xizmat', 'holat', 'izoh', 'xabar'];
  const csv = [head.join(',')].concat(
    rows.map((r) => [r.id, r.created_at, r.name, r.phone, r.service, r.status, r.note, r.message].map(esc).join(','))
  ).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="digitalverse-leads.csv"');
  res.send('﻿' + csv); // BOM so Excel reads the Cyrillic correctly
});

/* --------------------------------------------------------------- errors */
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  res.status(400).json({ error: err && err.message ? err.message : 'Xatolik yuz berdi.' });
});

/* --------------------------------------------------------------- static */
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d' }));
app.use('/admin', express.static(path.join(ROOT, 'admin')));
app.use(express.static(ROOT, { index: 'index.html', extensions: ['html'] }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('DIGITALVERSE running on http://localhost:' + PORT);
  console.log('Admin panel:            http://localhost:' + PORT + '/admin/');
});
