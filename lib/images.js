/* Portfolio images live in D1 as blobs. The admin resizes them in the browser
   before upload, so rows stay small and R2 — which wants a card on file even on
   the free tier — is not needed. */
const MAX_BYTES = 900 * 1024;
const OK_MIME = /^image\/(jpeg|png|webp|gif|avif)$/;

export async function saveImage(env, file) {
  if (!file || typeof file === 'string' || !file.size) return null;
  if (!OK_MIME.test(file.type)) throw new Error('Faqat rasm fayllari qabul qilinadi.');
  if (file.size > MAX_BYTES) {
    throw new Error('Rasm juda katta (' + Math.round(file.size / 1024) + ' KB). 900 KB gacha bo‘lsin.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const res = await env.DB.prepare('INSERT INTO images (mime, bytes) VALUES (?, ?)')
    .bind(file.type, bytes).run();
  return res.meta.last_row_id;
}

export async function deleteImage(env, id) {
  if (!id) return;
  await env.DB.prepare('DELETE FROM images WHERE id = ?').bind(Number(id)).run();
}
