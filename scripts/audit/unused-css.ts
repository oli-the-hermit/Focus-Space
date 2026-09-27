// Lists CSS class selectors that no source file can produce.
// A class counts as used when its name appears in src/ or index.html, or when source
// builds it from a template prefix (e.g. `is-${status}` covers .is-running).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'src');

const read = (dir: string, ext: RegExp): { file: string; text: string }[] =>
  fs.readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter(f => ext.test(f))
    .map(f => ({ file: path.join(dir, f), text: fs.readFileSync(path.join(dir, f), 'utf8') }));

const cssFiles = read(SRC, /\.css$/);
const code = [...read(SRC, /\.(ts|tsx)$/), { file: 'index.html', text: fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') }]
  .map(f => f.text).join('\n');

// Template prefixes such as `select--${variant}` or `is-${x}`.
const dynamicPrefixes = [...code.matchAll(/([a-z][a-z0-9-]*-)\$\{/g)].map(m => m[1]);

const unused = new Map<string, string[]>();
for (const { file, text } of cssFiles) {
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, '');
  // Only selector text (before each "{"), not declarations.
  const selectors = withoutComments.match(/[^{}]+(?=\{)/g) ?? [];
  for (const sel of selectors) {
    if (/^\s*@/.test(sel)) continue;
    for (const m of sel.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
      const cls = m[1];
      const used = new RegExp(`(^|[^\\w-])${cls}(?![\\w-])`).test(code) || dynamicPrefixes.some(p => cls.startsWith(p));
      if (!used) {
        const rel = path.relative(ROOT, file).split(path.sep).join('/');
        unused.set(cls, [...new Set([...(unused.get(cls) ?? []), rel])]);
      }
    }
  }
}

console.log(`CSS: ${unused.size} class selector(s) not produced by any source file${unused.size ? ':' : '.'}`);
for (const [cls, files] of [...unused].sort()) console.log(`  .${cls.padEnd(34)} ${files.join(', ')}`);
if (unused.size) process.exitCode = 1;
