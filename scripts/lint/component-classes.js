// The classes each ui component owns, read from src/styles/components/*.css. Shared by the
// ESLint rule (lint/no-component-class.js) and the CSS audit (audit/inline-overrides.ts).
//
// A class is a component's when it starts a compound selector there (".select-trigger",
// "> .chip"). Modifiers that only ever follow another selector (".btn-action.sm") and the
// shared state and surface prefixes (is-, has-, on-) are left out: features may use those
// names for their own elements.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMPONENT_CSS = path.join(ROOT, 'src', 'styles', 'components');

/**
 * Component styles allowed outside their component for now, with the step that ends it.
 * drag.css: the drag-to-reorder classes, until SortableList owns them (Pastel Studio plan 3.4).
 */
export const ALLOWED_FILES = ['drag.css'];

const SHARED_PREFIX = /^(is|has|on)-/;

/** Selector text only (before each "{"), comments and at-rules removed. */
export function selectorsOf(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return (text.match(/[^{}]+(?=\{)/g) ?? []).filter(sel => !/^\s*@/.test(sel));
}

/** Map of class name → the components/*.css file that owns it. */
export function componentClasses() {
  const owner = new Map();
  for (const file of fs.readdirSync(COMPONENT_CSS).filter(f => f.endsWith('.css')).sort()) {
    if (ALLOWED_FILES.includes(file)) continue;
    for (const sel of selectorsOf(fs.readFileSync(path.join(COMPONENT_CSS, file), 'utf8'))) {
      // A class right after the start, a space, a combinator, a comma or "(" starts a compound.
      for (const m of sel.matchAll(/(^|[\s>+~,(])\.(-?[_a-zA-Z][\w-]*)/g)) {
        const cls = m[2];
        if (!SHARED_PREFIX.test(cls) && !owner.has(cls)) owner.set(cls, file);
      }
    }
  }
  return owner;
}
