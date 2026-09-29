// The app version lives in package.json. tauri.conf.json points at it, and
// Cargo.toml has to repeat it (Cargo can't read JSON); this keeps them in step.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const version: string = JSON.parse(read('package.json')).version;
const tauriVersion: string = JSON.parse(read('src-tauri/tauri.conf.json')).version;
const cargoVersion = /^\[package\][^[]*?^version\s*=\s*"([^"]+)"/m.exec(read('src-tauri/Cargo.toml'))?.[1];

const problems: string[] = [];
if (tauriVersion !== '../package.json') problems.push(`src-tauri/tauri.conf.json "version" should be "../package.json", found "${tauriVersion}"`);
if (cargoVersion !== version) problems.push(`src-tauri/Cargo.toml version is ${cargoVersion}, package.json is ${version}`);

console.log(`App version: ${version}${problems.length ? '' : ' (in sync)'}`);
for (const p of problems) console.log('  ' + p);
if (problems.length) process.exitCode = 1;
