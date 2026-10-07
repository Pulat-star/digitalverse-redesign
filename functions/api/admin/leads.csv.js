import { requireAuth } from '../../../lib/auth.js';
import { SOURCES } from './leads.js';

const SITE_LABEL = { site: 'DIGITALVERSE', greatevent: 'Great Event' };

export const onRequestGet = async ({ request, env }) => {
  await requireAuth(request, env);
  const source = new URL(request.url).searchParams.get('source');
  const filtered = SOURCES.includes(source);
  const { results } = await env.DB.prepare(
    'SELECT id, created_at, name, phone, source, service, status, note, message FROM leads' +
    (filtered ? ' WHERE source = ?' : '') + ' ORDER BY created_at DESC'
  ).bind(...(filtered ? [source] : [])).all();
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const head = ['id', 'sana', 'sayt', 'ism', 'telefon', 'xizmat', 'holat', 'izoh', 'xabar'];
  const csv = [head.join(',')].concat((results || []).map((r) =>
    [r.id, r.created_at, SITE_LABEL[r.source] || r.source || 'DIGITALVERSE', r.name, r.phone,
     r.service, r.status, r.note, r.message].map(esc).join(','))).join('\r\n');
  return new Response('﻿' + csv, {           // BOM so Excel reads the Cyrillic
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + (filtered ? source : 'digitalverse') + '-leads.csv"'
    }
  });
};
