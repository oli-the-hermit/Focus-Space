// Generates src/constants/accentPalette.json from the presets (src/constants/accents.ts)
// and tokens.css, after checking every contrast rule. Run: npm run accents
// Pass --report to also print each preset's colors.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditPalette, buildPalette } from '../../src/lib/accentPalette.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOKENS = path.join(ROOT, 'src/styles/foundation/tokens.css');
const OUT = path.join(ROOT, 'src/constants/accentPalette.json');

const css = fs.readFileSync(TOKENS, 'utf8');
const palette = buildPalette(css);
const problems = auditPalette(palette, css);
if (problems.length) {
  console.error(`Accent palette: ${problems.length} contrast problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

if (process.argv.includes('--report')) {
  for (const [id, e] of Object.entries(palette)) {
    console.log(`${id.padEnd(18)} ${e.break.padEnd(5)} dark ${e.dark.slice(0, 8).join(' ')}  light ${e.light.slice(0, 8).join(' ')}`);
  }
}

fs.writeFileSync(OUT, `${JSON.stringify(palette, null, 1)}\n`);
console.log(`Accent palette: ${Object.keys(palette).length} presets written to src/constants/accentPalette.json`);
