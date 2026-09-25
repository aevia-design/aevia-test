// dev-server.mjs — local static server that mimics the two Cloudflare Pages behaviours the
// site relies on, so localhost can be clicked through like the rig (S195):
//   1. `_redirects` rules (the clean public URLs, TO-DOS #82): 200 = rewrite, 301/302 = redirect.
//   2. Extension-less addresses serve the .html file (/pages/order → pages/order.html).
// For browsing only. It is NOT a faithful test of `_redirects` edge cases — test rewrites
// on the rig (see CLAUDE.md). No caching, so edits show on a normal refresh.
//   npm run dev        → http://localhost:8080/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.xml': 'application/xml',
};

// "from to [status]" per line; # comments. Re-read per request so edits apply without a restart.
function rules() {
  return fs.readFileSync(path.join(ROOT, '_redirects'), 'utf8').split(/\r?\n/)
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => { const [from, to, status = '301'] = l.split(/\s+/); return { from, to, status: Number(status) }; });
}

// Resolve a URL path to a file: exact file, then .html, then a folder's index.html.
function findFile(urlPath) {
  const base = path.join(ROOT, decodeURIComponent(urlPath));
  if (!base.startsWith(ROOT)) return null;
  for (const f of [base, base + '.html', path.join(base, 'index.html')]) {
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let p = url.pathname;
  const rule = rules().find(r => r.from === p);
  if (rule && rule.status >= 300) {
    res.writeHead(rule.status, { Location: rule.to + url.search }); res.end(); return;
  }
  if (rule) p = rule.to;
  const file = findFile(p);
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404 ' + url.pathname); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Aevia dev server → http://localhost:${PORT}/  (Ctrl+C to stop)`));
