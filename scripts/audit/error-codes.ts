// Checks that both backends define the same API error codes and that the
// frontend has a message for every one of them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strings } from '../../src/constants/strings.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Codes only one backend can produce, with the reason. */
const ONLY_WEB: Record<string, string> = {
  PAYLOAD_TOO_LARGE: 'HTTP request body limit; the desktop app has no HTTP layer.'
};

const js = new Set([...read('server/errors.js').matchAll(/^\s+([A-Z_]+): '\1',?$/gm)].map(m => m[1]));
const rust = new Set([...read('src-tauri/src/backend/errors.rs').matchAll(/^pub const ([A-Z_]+): &str = "\1";$/gm)].map(m => m[1]));
const ui = new Set(Object.keys(strings.errors.api));

const problems: string[] = [];
for (const c of js) if (!rust.has(c) && !ONLY_WEB[c]) problems.push(`${c}: in server/errors.js but not in errors.rs`);
for (const c of rust) if (!js.has(c)) problems.push(`${c}: in errors.rs but not in server/errors.js`);
for (const c of new Set([...js, ...rust])) if (!ui.has(c)) problems.push(`${c}: no message in strings.errors.api`);
for (const c of ui) if (!js.has(c) && !rust.has(c)) problems.push(`${c}: message in strings.errors.api but no backend sends it`);

console.log(`API error codes: web ${js.size}, desktop ${rust.size}, messages ${ui.size}${problems.length ? '' : ' (in sync)'}`);
for (const p of problems) console.log('  ' + p);
if (problems.length) process.exitCode = 1;
