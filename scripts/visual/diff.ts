/**
 * Visual diff: compares two capture folders pixel by pixel.
 *
 *   npm run visual:diff                              → baseline vs current
 *   npm run visual:diff -- <baselineDir> <currentDir>
 *
 * Writes a red-highlighted diff PNG for every changed view into <currentDir>-diff
 * and exits non-zero when any view changed more than the tolerance.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [baseArg, currArg] = process.argv.slice(2);
const BASE_DIR = path.resolve(ROOT, baseArg ?? 'documentation/visual/baseline');
const CURR_DIR = path.resolve(ROOT, currArg ?? 'documentation/visual/current');
const DIFF_DIR = `${CURR_DIR}-diff`;
/** Share of changed pixels below which a view counts as unchanged (anti-aliasing noise). */
const TOLERANCE = 0.0005;

function listPngs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter(f => f.endsWith('.png'))
    .map(f => f.split(path.sep).join('/'))
    .sort();
}

const baseline = listPngs(BASE_DIR);
const current = new Set(listPngs(CURR_DIR));
fs.rmSync(DIFF_DIR, { recursive: true, force: true });

const rows: { view: string; result: string }[] = [];
let changed = 0;

for (const view of baseline) {
  if (!current.has(view)) {
    rows.push({ view, result: 'MISSING in current' });
    changed++;
    continue;
  }
  current.delete(view);
  const a = PNG.sync.read(fs.readFileSync(path.join(BASE_DIR, view)));
  const b = PNG.sync.read(fs.readFileSync(path.join(CURR_DIR, view)));
  if (a.width !== b.width || a.height !== b.height) {
    rows.push({ view, result: `SIZE ${a.width}x${a.height} → ${b.width}x${b.height}` });
    changed++;
    continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const pixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  const share = pixels / (a.width * a.height);
  if (share > TOLERANCE) {
    const out = path.join(DIFF_DIR, view);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, PNG.sync.write(diff));
    rows.push({ view, result: `CHANGED ${(share * 100).toFixed(2)}% (${pixels} px)` });
    changed++;
  }
}
for (const view of current) rows.push({ view, result: 'NEW (not in baseline)' });

console.log(`Compared ${baseline.length} views: ${baseline.length - changed} unchanged, ${changed} changed.`);
for (const r of rows) console.log(`  ${r.view.padEnd(36)} ${r.result}`);
if (changed) {
  console.log(`\nDiff images: ${path.relative(ROOT, DIFF_DIR)}`);
  process.exitCode = 1;
}
