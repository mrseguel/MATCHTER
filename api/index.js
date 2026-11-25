// Vercel Node function: keep the entire server in ESM.
export default async function handler(req,res) {
  try {
    const { default: app } = await import('../server/src/app.js');
    const parsed = new URL(req.url, 'http://localhost');
    const path = parsed.searchParams.get('__matchter_path');
    if (path !== null) {
      parsed.searchParams.delete('__matchter_path');
      req.url = '/api/' + path + (parsed.searchParams.size ? '?' + parsed.searchParams.toString() : '');
    }
    return app(req,res);
  } catch (error) {
    console.error('MATCHTER API initialization failed', error);
    if (!res.headersSent) {
      res.statusCode = 503;
      res.setHeader('Content-Type','application/json; charset=utf-8');
      return res.end(JSON.stringify({message:'API temporalmente no disponible'}));
    }
    return res.end();
  }
}
