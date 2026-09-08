export const onRequestGet = async ({ params, env }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return new Response('Not found', { status: 404 });
  const row = await env.DB.prepare('SELECT mime, bytes FROM images WHERE id = ?').bind(id).first();
  if (!row) return new Response('Not found', { status: 404 });
  return new Response(row.bytes, {
    headers: {
      'Content-Type': row.mime || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
};
