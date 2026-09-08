import { requireAuth } from '../../../lib/auth.js';
export const onRequestGet = async ({ request, env }) => {
  await requireAuth(request, env);
  const { results } = await env.DB.prepare(
    'SELECT id, created_at, name, phone, service, status, note, message FROM leads ORDER BY created_at DESC').all();
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const head = ['id', 'sana', 'ism', 'telefon', 'xizmat', 'holat', 'izoh', 'xabar'];
  const csv = [head.join(',')].concat((results || []).map((r) =>
    [r.id, r.created_at, r.name, r.phone, r.service, r.status, r.note, r.message].map(esc).join(','))).join('\r\n');
  return new Response('﻿' + csv, {           // BOM so Excel reads the Cyrillic
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="digitalverse-leads.csv"'
    }
  });
};
