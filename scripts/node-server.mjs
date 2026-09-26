// Minimal Node HTTP host for the TanStack Start fetch handler.
// The Vite build emits dist/server/server.js as a module exporting a fetch
// handler, not a listening server — this file provides the listener.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import server_default from '../dist/server/server.js';

const PORT = Number(process.env.PORT ?? 3000);
const CLIENT_DIR = join(process.cwd(), 'dist', 'client');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
};

function toRequest(req, body) {
  const proto = req.headers['x-forwarded-proto'] ?? 'http';
  const url = `${proto}://${req.headers.host ?? 'localhost'}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) headers.append(key, v);
  }
  const method = req.method ?? 'GET';
  const init = { method, headers };
  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    init.body = body;
  }
  return new Request(url, init);
}

async function sendResponse(res, response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = headers[key] ? `${headers[key]}, ${value}` : value;
  });
  res.writeHead(response.status, headers);
  if (response.body) {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  }
  res.end();
}

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);

    // Static assets: only when the file actually exists on disk.
    const ext = extname(pathname);
    if (ext && pathname.startsWith('/assets/')) {
      const safe = normalize(pathname).replace(/^([.][.][/\\])+/, '');
      try {
        const buffer = await readFile(join(CLIENT_DIR, safe));
        res.writeHead(200, {
          'content-type': MIME[ext] ?? 'application/octet-stream',
          'cache-control': 'public, max-age=31536000, immutable',
        });
        res.end(buffer);
        return;
      } catch {
        // fall through to the app handler
      }
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

    const response = await server_default.fetch(toRequest(req, body));
    await sendResponse(res, response);
  } catch (error) {
    console.error('Request failed:', error);
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
