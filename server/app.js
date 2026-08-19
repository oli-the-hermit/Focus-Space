import express from 'express';
import { getDb } from './db.js';
import { hashPassword, verifyPassword, generateToken, hashToken } from './crypto.js';

const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 days
const MAX_PROFILES = 6;
const LOCKOUT_MAX_FAILURES = 5;
const LOCKOUT_MS = 30_000;
const LOGIN_FAIL_DELAY_MS = 250;
const MAX_BLOB_BYTES = 1.5 * 1024 * 1024; // 1.5 MB encrypted blob cap

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,24}$/;

// ── Validation helpers ───────────────────────────────────────────
function validateUsername(v) {
  return typeof v === 'string' && USERNAME_RE.test(v);
}
function validateDisplayName(v) {
  return typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 40;
}
function validatePassword(v) {
  return typeof v === 'string' && v.length >= 8 && v.length <= 128;
}
function validateIv(v) {
  if (typeof v !== 'string' || v.length === 0) return false;
  return Buffer.from(v, 'base64').length === 12;
}
function validateCipher(v) {
  if (typeof v !== 'string' || v.length === 0) return false;
  return Buffer.from(v, 'base64').length <= MAX_BLOB_BYTES;
}
function validateSalt(v) {
  if (typeof v !== 'string') return false;
  return Buffer.from(v, 'hex').length === 16;
}

// ── Brute-force limiter (in-memory) ──────────────────────────────
const attempts = new Map(); // key -> { count, blockedUntil }

function getAttemptKey(req, username) {
  return `${req.ip}:${String(username).toLowerCase()}`;
}
function isBlocked(key) {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (entry.blockedUntil && entry.blockedUntil > Date.now()) return true;
  if (entry.blockedUntil && entry.blockedUntil <= Date.now()) attempts.delete(key);
  return false;
}
function recordFailure(key) {
  const entry = attempts.get(key) || { count: 0, blockedUntil: null };
  entry.count += 1;
  if (entry.count >= LOCKOUT_MAX_FAILURES) {
    entry.blockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0;
  }
  attempts.set(key, entry);
}
function recordSuccess(key) {
  attempts.delete(key);
}
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// ── Middleware ───────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing or invalid session token' });

  const row = getDb()
    .prepare(
      `SELECT s.token_hash, s.expires_at, p.id, p.username, p.display_name, p.avatar, p.role
       FROM sessions s JOIN profiles p ON p.id = s.profile_id
       WHERE s.token_hash = ?`
    )
    .get(hashToken(token));

  if (!row) return res.status(401).json({ error: 'Invalid session token' });
  if (row.expires_at < Date.now()) {
    getDb().prepare('DELETE FROM sessions WHERE token_hash = ?').run(row.token_hash);
    return res.status(401).json({ error: 'Session expired' });
  }

  // Sliding expiry
  getDb()
    .prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
    .run(Date.now() + SESSION_TTL_MS, row.token_hash);

  req.profile = {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
    role: row.role
  };
  req.tokenHash = row.token_hash;
  next();
}

function requireOwner(req, res, next) {
  if (req.profile.role !== 'owner') {
    return res.status(403).json({ error: 'Owner privileges required' });
  }
  next();
}

// ── Shape helpers ────────────────────────────────────────────────
function publicProfile(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createSession(profileId) {
  const token = generateToken();
  const now = Date.now();
  getDb()
    .prepare('INSERT INTO sessions (token_hash, profile_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(hashToken(token), profileId, now, now + SESSION_TTL_MS);
  return token;
}

function assertUniqueUsername(username) {
  const exists = getDb().prepare('SELECT id FROM profiles WHERE username = ? COLLATE NOCASE').get(username);
  if (exists) {
    const err = new Error('Username is already taken');
    err.status = 409;
    throw err;
  }
}

// ── App ──────────────────────────────────────────────────────────
function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // ── Health / bootstrap ────────────────────────────────────────
  app.get('/api/health', (req, res) => {
    const count = getDb().prepare('SELECT COUNT(*) AS n FROM profiles').get().n;
    res.json({ ok: true, requiresSetup: count === 0 });
  });

  // ── Auth ──────────────────────────────────────────────────────
  app.post('/api/auth/setup', async (req, res, next) => {
    try {
      const { username, displayName, password } = req.body || {};
      if (!validateUsername(username)) return res.status(400).json({ error: 'Username must be 3-24 characters (letters, digits, . _ -)' });
      if (!validateDisplayName(displayName)) return res.status(400).json({ error: 'Display name must be 1-40 characters' });
      if (!validatePassword(password)) return res.status(400).json({ error: 'Password must be 8-128 characters' });

      const db = getDb();
      const existing = db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n;
      if (existing > 0) return res.status(409).json({ error: 'Main account already exists' });

      const { salt, hash } = hashPassword(password);
      const now = Date.now();
      const info = db
        .prepare(
          `INSERT INTO profiles (username, display_name, role, salt, password_hash, created_at, updated_at)
           VALUES (?, ?, 'owner', ?, ?, ?, ?)`
        )
        .run(username, displayName.trim(), salt, hash, now, now);

      const profile = publicProfile(db.prepare('SELECT * FROM profiles WHERE id = ?').get(info.lastInsertRowid));
      const token = createSession(profile.id);
      res.status(201).json({ token, profile, data: { salt, iv: '', cipher: '' } });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const { username, password } = req.body || {};
      if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const key = getAttemptKey(req, username);
      if (isBlocked(key)) return res.status(429).json({ error: 'Too many failed attempts. Try again in 30 seconds.' });

      const row = getDb().prepare('SELECT * FROM profiles WHERE username = ? COLLATE NOCASE').get(username);
      const ok = row ? verifyPassword(password, row.salt, row.password_hash) : false;

      if (!ok) {
        recordFailure(key);
        await delay(LOGIN_FAIL_DELAY_MS);
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      recordSuccess(key);
      const token = createSession(row.id);
      const profile = publicProfile(row);
      res.json({
        token,
        profile,
        data: { salt: row.salt, iv: row.data_iv, cipher: row.data_cipher }
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/logout', requireAuth, (req, res) => {
    getDb().prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.tokenHash);
    res.status(204).end();
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ profile: req.profile });
  });

  // ── Encrypted per-profile data ────────────────────────────────
  app.get('/api/data', requireAuth, (req, res) => {
    const row = getDb().prepare('SELECT salt, data_iv, data_cipher FROM profiles WHERE id = ?').get(req.profile.id);
    res.json(
      row.data_cipher
        ? { salt: row.salt, iv: row.data_iv, cipher: row.data_cipher }
        : { salt: row.salt, iv: '', cipher: '' }
    );
  });

  app.put('/api/data', requireAuth, (req, res, next) => {
    try {
      const { iv, cipher } = req.body || {};
      if (!validateIv(iv) || !validateCipher(cipher)) {
        return res.status(400).json({ error: 'Invalid encrypted payload' });
      }
      getDb()
        .prepare('UPDATE profiles SET data_iv = ?, data_cipher = ?, updated_at = ? WHERE id = ?')
        .run(iv, cipher, Date.now(), req.profile.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ── Self profile management ───────────────────────────────────
  app.put('/api/profile', requireAuth, (req, res, next) => {
    try {
      const { displayName, username, avatar } = req.body || {};
      const db = getDb();
      const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.profile.id);

      const patch = {};
      if (displayName !== undefined) {
        if (!validateDisplayName(displayName)) return res.status(400).json({ error: 'Display name must be 1-40 characters' });
        patch.display_name = displayName.trim();
      }
      if (username !== undefined) {
        if (!validateUsername(username)) return res.status(400).json({ error: 'Username must be 3-24 characters (letters, digits, . _ -)' });
        if (username.toLowerCase() !== row.username.toLowerCase()) {
          assertUniqueUsername(username);
        }
        patch.username = username;
      }
      if (avatar !== undefined) {
        if (typeof avatar !== 'string' || avatar.length > 200_000) {
          return res.status(400).json({ error: 'Avatar is too large' });
        }
        patch.avatar = avatar;
      }

      if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nothing to update' });

      const sets = Object.keys(patch).map(k => `${k} = ?`).join(', ');
      const values = Object.values(patch);
      db.prepare(`UPDATE profiles SET ${sets}, updated_at = ? WHERE id = ?`).run(...values, Date.now(), req.profile.id);
      const updated = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.profile.id);
      res.json({ profile: publicProfile(updated) });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/profile/password', requireAuth, async (req, res, next) => {
    try {
      const { currentPassword, newPassword, salt, iv, cipher } = req.body || {};
      const db = getDb();
      const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.profile.id);

      if (!verifyPassword(currentPassword || '', row.salt, row.password_hash)) {
        await delay(LOGIN_FAIL_DELAY_MS);
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      if (!validatePassword(newPassword)) {
        return res.status(400).json({ error: 'New password must be 8-128 characters' });
      }
      if (!validateSalt(salt) || !validateIv(iv) || !validateCipher(cipher)) {
        return res.status(400).json({ error: 'Re-encrypted data payload is required' });
      }

      const { hash } = hashPassword(newPassword, salt);
      db.prepare('UPDATE profiles SET salt = ?, password_hash = ?, data_iv = ?, data_cipher = ?, updated_at = ? WHERE id = ?')
        .run(salt, hash, iv, cipher, Date.now(), row.id);

      // Invalidate other sessions so old passwords stop working elsewhere
      db.prepare('DELETE FROM sessions WHERE profile_id = ?').run(row.id);
      const token = createSession(row.id);

      const updated = db.prepare('SELECT * FROM profiles WHERE id = ?').get(row.id);
      res.json({ token, profile: publicProfile(updated) });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/profile', requireAuth, async (req, res, next) => {
    try {
      const { password } = req.body || {};
      if (req.profile.role === 'owner') {
        return res.status(403).json({ error: 'The main account cannot delete itself' });
      }
      const row = getDb().prepare('SELECT * FROM profiles WHERE id = ?').get(req.profile.id);
      if (!verifyPassword(password || '', row.salt, row.password_hash)) {
        await delay(LOGIN_FAIL_DELAY_MS);
        return res.status(401).json({ error: 'Password is incorrect' });
      }
      getDb().prepare('DELETE FROM profiles WHERE id = ?').run(row.id); // cascades sessions
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ── Owner profile management ──────────────────────────────────
  app.get('/api/profiles', requireAuth, requireOwner, (req, res) => {
    const rows = getDb().prepare('SELECT * FROM profiles ORDER BY role DESC, created_at ASC').all();
    res.json({ profiles: rows.map(publicProfile) });
  });

  app.post('/api/profiles', requireAuth, requireOwner, (req, res, next) => {
    try {
      const { username, displayName, password } = req.body || {};
      if (!validateUsername(username)) return res.status(400).json({ error: 'Username must be 3-24 characters (letters, digits, . _ -)' });
      if (!validateDisplayName(displayName)) return res.status(400).json({ error: 'Display name must be 1-40 characters' });
      if (!validatePassword(password)) return res.status(400).json({ error: 'Password must be 8-128 characters' });

      const db = getDb();
      const count = db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n;
      if (count >= MAX_PROFILES) {
        return res.status(409).json({ error: `Profile limit reached (max ${MAX_PROFILES})` });
      }
      assertUniqueUsername(username);

      const { salt, hash } = hashPassword(password);
      const now = Date.now();
      const info = db
        .prepare(
          `INSERT INTO profiles (username, display_name, role, salt, password_hash, created_at, updated_at)
           VALUES (?, ?, 'user', ?, ?, ?, ?)`
        )
        .run(username, displayName.trim(), salt, hash, now, now);

      const profile = publicProfile(db.prepare('SELECT * FROM profiles WHERE id = ?').get(info.lastInsertRowid));
      res.status(201).json({ profile });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/profiles/:id', requireAuth, requireOwner, (req, res, next) => {
    try {
      const { displayName } = req.body || {};
      if (!validateDisplayName(displayName)) {
        return res.status(400).json({ error: 'Display name must be 1-40 characters' });
      }
      const db = getDb();
      const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
      if (!row) return res.status(404).json({ error: 'Profile not found' });

      db.prepare('UPDATE profiles SET display_name = ?, updated_at = ? WHERE id = ?')
        .run(displayName.trim(), Date.now(), row.id);
      const updated = db.prepare('SELECT * FROM profiles WHERE id = ?').get(row.id);
      res.json({ profile: publicProfile(updated) });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/profiles/:id', requireAuth, requireOwner, (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Profile not found' });
    if (row.id === req.profile.id) {
      return res.status(400).json({ error: 'The main account cannot delete itself' });
    }
    db.prepare('DELETE FROM profiles WHERE id = ?').run(row.id); // cascades sessions
    res.status(204).end();
  });

  // ── Danger zone: reset all non-owner profiles ─────────────────
  app.post('/api/reset-profiles', requireAuth, requireOwner, async (req, res, next) => {
    try {
      const { password } = req.body || {};
      const db = getDb();
      const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.profile.id);
      if (!verifyPassword(password || '', row.salt, row.password_hash)) {
        await delay(LOGIN_FAIL_DELAY_MS);
        return res.status(401).json({ error: 'Password is incorrect' });
      }

      const reset = db.transaction(() => {
        const info = db.prepare("DELETE FROM profiles WHERE role = 'user'").run();
        return info.changes;
      });
      const deleted = reset();
      res.json({ deleted });
    } catch (err) {
      next(err);
    }
  });

  // ── Error handler ─────────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

export { createApp };