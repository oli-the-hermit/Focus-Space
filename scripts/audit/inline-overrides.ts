// Lists feature and layout CSS that changes how a ui component looks from outside it.
// A rule in src/styles/{features,layout} that selects a component's class may only place it:
// layout properties (margin, flex, grid placement, width, ...) and custom properties (the
// component's own knobs, e.g. --progress-track). Anything else (color, size, padding, radius)
// belongs in the component, as a prop or variant.
// A deliberate exception says so in a comment starting with "Exception" right above the rule;
// it covers the rules that follow up to the next blank line or comment.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentClasses } from '../lint/component-classes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STYLES = path.join(ROOT, 'src', 'styles');

const LAYOUT_PROPS = new RegExp('^(' + [
  '--[\\w-]+',
  'margin(-[a-z-]+)?',
  'flex(-[a-z]+)?',
  'order',
  '(align|justify|place)-self',
  'grid-(area|column|row)(-[a-z]+)?',
  '(min-|max-)?width',
  '(-webkit-)?user-select',
  'pointer-events'
].join('|') + ')$');

const owner = componentClasses();
const problems: string[] = [];
let exceptions = 0;

for (const dir of ['features', 'layout']) {
  for (const name of fs.readdirSync(path.join(STYLES, dir)).filter(f => f.endsWith('.css')).sort()) {
    const css = fs.readFileSync(path.join(STYLES, dir, name), 'utf8');
    let excepted = false;
    // Walk the text between braces: before "{" is a prelude (comments, blank lines, then a
    // selector or an at-rule); before the "}" that follows a rule's "{" is its body.
    let prelude: string | null = null;
    let preludeEnd = 0;
    for (const m of css.matchAll(/([^{}]*)([{}])/g)) {
      const [, text, brace] = m;
      if (brace === '{') {
        prelude = text;
        preludeEnd = (m.index ?? 0) + text.length;
        continue;
      }
      if (prelude === null) continue; // the end of an @media block
      const body = text;
      const pre = prelude;
      prelude = null;
      // Walk the prelude in order: a blank line or a comment ends the previous scope.
      for (const part of pre.split(/(\/\*[\s\S]*?\*\/)/)) {
        if (part.startsWith('/*')) excepted = /^\/\*\s*Exception/.test(part);
        else if (/\n[ \t]*\r?\n/.test(part)) excepted = false;
      }
      const selector = pre.replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!selector || selector.startsWith('@')) continue;
      const classes = [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map(c => c[1]).filter(c => owner.has(c));
      if (classes.length === 0) continue;
      const props = body.split(';').map(d => d.split(':')[0].trim()).filter(Boolean);
      const styling = props.filter(p => !LAYOUT_PROPS.test(p));
      if (styling.length === 0) continue;
      if (excepted) { exceptions++; continue; }
      const line = css.slice(0, preludeEnd).split('\n').length;
      problems.push(`  src/styles/${dir}/${name}:${line}  ${selector.replace(/\s+/g, ' ')}  →  ${styling.join(', ')}  (${[...new Set(classes.map(c => owner.get(c)))].join(', ')})`);
    }
  }
}

console.log(`Inline overrides: ${problems.length} rule(s) restyle a ui component from outside${problems.length ? ':' : ''} (${exceptions} marked as exceptions).`);
for (const p of problems) console.log(p);
if (problems.length) {
  console.log('Move the style into the component (a prop or variant), or mark it with an "Exception (why)" comment.');
  process.exitCode = 1;
}
