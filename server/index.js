import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';
import { initDb, DB_PATH } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 4000;
const HOST = '127.0.0.1';
let db;

// Optionally serve the built frontend (production mode): node server/index.js --static
// or set NODE_ENV=production
const serveStatic =
  process.argv.includes('--static') || process.env.NODE_ENV === 'production';

try {
  db = initDb();
} catch (err) {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}

const app = createApp();

if (serveStatic) {
  const dist = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api/')) {
        return res.sendFile(path.join(dist, 'index.html'));
      }
      next();
    });
  } else {
    console.warn('dist/ not found — run `npm run build` first for production mode.');
  }
}

const server = app.listen(PORT, HOST, () => {
  console.log(`FocusSpace API listening on http://${HOST}:${PORT}`);
  console.log(`Database file: ${DB_PATH}`);
  console.log(`Production static mode: ${serveStatic ? 'ON' : 'OFF'}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${PORT} is already in use by another process.`);
    console.error(`Please close any existing Node/Vite instances running on port ${PORT}.\n`);
  } else {
    console.error('[ERROR] Server startup error:', err);
  }
  process.exit(1);
});