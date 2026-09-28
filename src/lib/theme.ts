import type { ThemeMode } from '../types';
import { storage } from './storage';

export type ResolvedTheme = 'light' | 'dark';

/** 'system' follows the OS; with no OS preference the app is light. */
export function resolveTheme(mode: ThemeMode, win: Window = window): ResolvedTheme {
  if (mode !== 'system') return mode;
  return win.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Applies a theme to a document (the main window, the mini player's PiP window, the alert island). */
export function applyTheme(mode: ThemeMode, doc: Document = document): ResolvedTheme {
  const resolved = resolveTheme(mode, doc.defaultView ?? window);
  doc.documentElement.dataset.theme = resolved;
  doc.documentElement.style.colorScheme = resolved;
  return resolved;
}

const isThemeMode = (v: unknown): v is ThemeMode => v === 'light' || v === 'dark' || v === 'system';

/** The last theme the main window used, so other windows paint in it before their data arrives. */
export function cachedTheme(): ThemeMode | null {
  const v = storage.get('themeCache');
  return isThemeMode(v) ? v : null;
}

export function cacheTheme(mode: ThemeMode): void {
  storage.set('themeCache', mode);
}

/** Reads a design token from the page, e.g. cssVar('--accent'). Tokens live in styles/foundation/tokens.css. */
export function cssVar(name: string, doc: Document = document): string {
  return getComputedStyle(doc.documentElement).getPropertyValue(name).trim();
}

/**
 * A duration token in milliseconds, e.g. cssDurationMs('--dur-2') → 180. JS timers that
 * wait for a CSS animation read the token instead of repeating its value.
 */
export function cssDurationMs(name: string, doc: Document = document): number {
  const raw = cssVar(name, doc);
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return 0;
  return raw.endsWith('ms') ? n : n * 1000;
}
