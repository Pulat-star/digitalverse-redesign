export const onRequest = async (context) => {
  try {
    return await context.next();
  } catch (e) {
    if (e instanceof Response) return e;           // requireAuth throws a 401
    return new Response(JSON.stringify({ error: e?.message || 'Xatolik yuz berdi.' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
};
