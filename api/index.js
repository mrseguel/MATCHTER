import app from '../server/src/app.js'
export default function handler(req,res) {
  const parsed = new URL(req.url, 'http://localhost');
  const path = parsed.searchParams.get('__matchter_path');
  if (path !== null) { parsed.searchParams.delete('__matchter_path'); req.url = '/api/' + path + (parsed.searchParams.size ? '?' + parsed.searchParams.toString() : ''); }
  return app(req,res)
}
