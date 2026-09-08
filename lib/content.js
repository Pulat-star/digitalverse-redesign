/* The editable-text registry. The key is written into index.html as
   data-cms="…"; the label and group only build the admin form. Adding a field
   means adding the attribute in the HTML and one line here. */
export const CONTENT_META = [
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

export const CONTENT_KEYS = new Set(CONTENT_META.map((m) => m[0]));

/* Defaults are read straight out of the published index.html, so the original
   copy is never duplicated into the database or into this file. */
let cached = null;
export async function readDefaults(request) {
  if (cached) return cached;
  const out = {};
  try {
    const res = await fetch(new URL('/index.html', request.url));
    if (!res.ok) return out;
    const html = await res.text();
    const re = /data-cms="([^"]+)"[^>]*>([\s\S]*?)</g;
    let m;
    while ((m = re.exec(html))) {
      const key = m[1];
      if (!CONTENT_KEYS.has(key) || out[key] !== undefined) continue;
      out[key] = m[2].replace(/\s+/g, ' ').trim();
    }
  } catch (e) { /* fall through with what we have */ }
  cached = out;
  return out;
}
