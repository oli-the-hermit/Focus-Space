// Lists strings.ts leaf keys that no source file references (direct, aliased or dynamic).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { strings } from '../../src/constants/strings.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const files: string[] = [];
const walk = (d: string) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name) && !p.endsWith('strings.ts')) files.push(p);
  }
};
walk(path.join(ROOT, 'src'));
walk(path.join(ROOT, 'scripts'));
const sources = files.map(f => ({ f, src: fs.readFileSync(f, 'utf8') }));

// Collect leaf paths.
const leaves: string[][] = [];
const visit = (obj: unknown, p: string[]) => {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) visit(v, [...p, k]);
  } else leaves.push(p);
};
visit(strings, []);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function isUsed(leaf: string[]): boolean {
  for (const { src } of sources) {
    // Any prefix of the path accessed dynamically, e.g. strings.onboarding.chapters[x]
    for (let i = 1; i <= leaf.length; i++) {
      const prefix = ['strings', ...leaf.slice(0, i)].map(esc).join('\\.');
      const rest = leaf.slice(i);
      if (i < leaf.length && new RegExp(`${prefix}\\[`).test(src)) return true;
      // Direct use of the full path (or a parent object passed around whole, e.g. items={strings.help.faq})
      // A leaf may be followed by a method call such as .replace(...)
      if (rest.length === 0 && new RegExp(`${prefix}(?![\\w$])`).test(src)) return true;
      if (rest.length > 0) {
        // Ignore alias assignments (handled below); anything else hands the whole object on.
        const whole = [...src.matchAll(new RegExp(`${prefix}\\b(?![.\\[\\w])`, 'g'))];
        if (whole.some(m => !/(?:const|let)\s+\w+\s*=\s*$/.test(src.slice(Math.max(0, m.index! - 40), m.index)))) return true;
      }
      // Alias: const x = strings.a.b;  then x.c...
      const aliasRe = new RegExp(`(?:const|let)\\s+(\\w+)\\s*=\\s*${prefix}\\s*;`, 'g');
      for (const m of src.matchAll(aliasRe)) {
        const alias = m[1];
        if (rest.length === 0) return true;
        const restRe = [alias, ...rest].map(esc).join('\\.');
        if (new RegExp(`\\b${restRe}(?![\\w$])`).test(src)) return true;
        // A parent reached through the alias and used whole, e.g. { ...s.player }
        for (let j = 1; j < rest.length; j++) {
          const partial = [alias, ...rest.slice(0, j)].map(esc).join('\\.');
          if (new RegExp(`\\b${partial}(?![\\w$.\\[])`).test(src)) return true;
        }
        if (new RegExp(`\\b${esc(alias)}\\[`).test(src)) return true;
      }
    }
  }
  return false;
}

const unused = leaves.filter(l => !isUsed(l)).map(l => l.join('.'));
console.log(`strings.ts: ${leaves.length} keys, ${unused.length} unused${unused.length ? ':' : '.'}`);
for (const u of unused) console.log('  ' + u);
if (unused.length) process.exitCode = 1;
