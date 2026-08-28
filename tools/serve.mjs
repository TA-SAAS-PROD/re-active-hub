import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const ROOT = process.argv[2] || 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io/site';
const PORT = Number(process.argv[3] || 5178);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.avif': 'image/avif', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8',
};

createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
  try {
    const safe = normalize(p).replace(/^(\.\.[/\\])+/, '');
    let s;
    try {
      s = await stat(file);
    } catch (e) {
      // mirror Vite: everything under public/ is served from the site root,
      // so /remix/tokens.x.css resolves to public/remix/tokens.x.css
      file = join(ROOT, 'public', safe);
      s = await stat(file);
    }
    if (s.isDirectory()) file = join(file, 'index.html');
    const buf = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch {
    // SPA-ish fallback so the template's internal links don't 404 the harness
    try {
      const buf = await readFile(join(ROOT, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(buf);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  }
}).listen(PORT, () => console.log('serving ' + ROOT + ' on http://127.0.0.1:' + PORT));
