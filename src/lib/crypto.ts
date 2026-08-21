// WebCrypto helpers: per-profile AES-256-GCM, key derived from the profile password.
// The plaintext app state never leaves the browser; only ciphertext is sent to the API.

const PBKDF2_ITERATIONS = 310000;
const KEY_LEN_BYTES = 32;

// ── Small base64 / hex utils (browser-safe, chunked to avoid stack limits) ──
function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

// ── Key derivation: PBKDF2(password, salt) → AES-256-GCM key ─────────────
export function randomSaltHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function deriveDataKey(password: string, saltHex: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: KEY_LEN_BYTES * 8 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportRawKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return bytesToBase64(new Uint8Array(raw));
}

export async function importRawKey(b64: string): Promise<CryptoKey> {
  const bytes = base64ToBytes(b64);
  return crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}

export interface SealedBlob {
  iv: string;
  cipher: string;
}

// ── Encrypt / decrypt the serialized app state ───────────────────────────
export async function encryptBlob(json: string, key: CryptoKey): Promise<SealedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(json)
  );
  return { iv: bytesToBase64(iv), cipher: bytesToBase64(new Uint8Array(cipher)) };
}

export async function decryptBlob(sealed: SealedBlob, key: CryptoKey): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(sealed.iv) },
    key,
    base64ToBytes(sealed.cipher)
  );
  return new TextDecoder().decode(plain);
}