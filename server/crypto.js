import crypto from 'node:crypto';

const PBKDF2_ITERATIONS = 310000;
const KEY_LEN = 32;
const SALT_BYTES = 16;

// ── Password hashing (PBKDF2-SHA256) ─────────────────────────────
export function hashPassword(password, saltHex) {
  return new Promise((resolve, reject) => {
    const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(SALT_BYTES);
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LEN, 'sha256', (err, derivedKey) => {
      if (err) return reject(err);
      resolve({ salt: salt.toString('hex'), hash: derivedKey.toString('hex') });
    });
  });
}

export async function verifyPassword(password, saltHex, expectedHash) {
  try {
    const { hash } = await hashPassword(password, saltHex);
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ── Session tokens ───────────────────────────────────────────────
export function generateToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}