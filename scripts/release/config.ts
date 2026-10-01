/**
 * Writes src-tauri/tauri.release.conf.json (gitignored) for a release build:
 * update files on, and the public update key from shared/release.json, which
 * the Tauri CLI needs to sign them. The CI release workflow runs this, then
 * `tauri build --config src-tauri/tauri.release.conf.json`.
 *
 *   node scripts/release/config.ts
 *
 * Fails when shared/release.json isn't filled in: that release couldn't update itself.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const release = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/release.json'), 'utf8')) as {
  githubRepo: string;
  updaterPubkey: string;
};

if (!release.githubRepo.trim() || !release.updaterPubkey.trim()) {
  console.error('Fill in githubRepo and updaterPubkey in shared/release.json first (see docs/releasing.md).');
  process.exit(1);
}

const out = path.join(ROOT, 'src-tauri/tauri.release.conf.json');
const config = {
  bundle: { createUpdaterArtifacts: true },
  plugins: { updater: { pubkey: release.updaterPubkey.trim() } }
};
fs.writeFileSync(out, JSON.stringify(config, null, 2) + '\n');
console.log(`Wrote ${path.relative(ROOT, out)} for ${release.githubRepo.trim()}`);
