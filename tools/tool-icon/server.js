#!/usr/bin/env node
// Zero-dependency static server for tool-icon (Node stdlib only).
// Serves the renderer + concepts.json, and persists selections.json via a tiny
// JSON API. Open the printed URL in a browser — DevTools gives you full debug.
//
//   node server.js            # → http://localhost:5173
//   PORT=8080 node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const RENDERER = path.join(ROOT, 'renderer');
const CONCEPTS_PATH = path.join(ROOT, 'concepts.json');
const SELECTIONS_PATH = path.join(ROOT, 'selections.json');
const PORT = process.env.PORT || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

function serveFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, buf, MIME[path.extname(file)] || 'application/octet-stream');
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  // ── API ──────────────────────────────────────────────────────────────
  if (pathname === '/api/selections' && req.method === 'GET') {
    let data = {};
    try { data = JSON.parse(fs.readFileSync(SELECTIONS_PATH, 'utf8')); } catch { /* none yet */ }
    return send(res, 200, JSON.stringify(data), MIME['.json']);
  }
  if (pathname === '/api/selections' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        fs.writeFileSync(SELECTIONS_PATH, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
        send(res, 200, JSON.stringify({ path: SELECTIONS_PATH }), MIME['.json']);
      } catch (e) {
        send(res, 400, JSON.stringify({ error: e.message }), MIME['.json']);
      }
    });
    return;
  }

  // ── Static ───────────────────────────────────────────────────────────
  if (pathname === '/' ) return serveFile(res, path.join(RENDERER, 'index.html'));
  if (pathname === '/concepts.json') return serveFile(res, CONCEPTS_PATH);

  // Restrict to the renderer dir (no path traversal).
  const rel = pathname.replace(/^\/+/, '');
  const file = path.normalize(path.join(RENDERER, rel));
  if (!file.startsWith(RENDERER)) return send(res, 403, 'Forbidden');
  serveFile(res, file);
});

server.listen(PORT, () => {
  console.log(`tool-icon → http://localhost:${PORT}`);
});
