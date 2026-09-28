import { strings } from './strings';

/**
 * Every keyboard shortcut, once. useShortcuts dispatches from it, menus show
 * its key caps as hints, and Help → Keyboard shortcuts lists it in this order.
 */
export const SHORTCUTS = [
  { id: 'toggleTimer', keys: [' '], caps: [strings.keys.space] },
  { id: 'skip', keys: ['s'], caps: ['S'] },
  { id: 'reset', keys: ['r'], caps: ['R'] },
  { id: 'newSession', keys: ['n'], caps: ['N'] },
  { id: 'miniPlayer', keys: ['m'], caps: ['M'] },
  { id: 'help', keys: ['?'], caps: ['?'] },
  // Handled by the context menu itself (and Windows' Menu key); listed for Help only.
  { id: 'contextMenu', keys: [], caps: [strings.keys.shift, 'F10'] }
] as const;

export type ShortcutId = (typeof SHORTCUTS)[number]['id'];

/** Key caps joined for a menu hint: "Space", "Shift+F10". */
export function shortcutHint(id: ShortcutId): string {
  return SHORTCUTS.find(s => s.id === id)!.caps.join('+');
}

/** The shortcut bound to a KeyboardEvent.key (letters matched case-insensitively). */
export function shortcutForKey(key: string): ShortcutId | undefined {
  const k = key.length === 1 ? key.toLowerCase() : key;
  return SHORTCUTS.find(s => (s.keys as readonly string[]).includes(k))?.id;
}
