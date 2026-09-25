/**
 * Desktop (Tauri) integration for the mini player.
 *
 * Tauri modules are imported lazily so the plain browser build never loads them.
 * Main and mini windows talk over two events:
 *   - EVT_TIMER_STATE   main → mini   TimerSnapshot on every change
 *   - EVT_TIMER_COMMAND mini → main   MiniCommand (controls, sync, lifecycle)
 */
import type { TimerSnapshot } from './timerSnapshot';

export const MINI_WINDOW_LABEL = 'mini';
/** URL hash that makes `main.tsx` render the mini player instead of the app. */
export const MINI_WINDOW_HASH = '#mini';
export const EVT_TIMER_STATE = 'fs:timer-state';
export const EVT_TIMER_COMMAND = 'fs:timer-command';

export const MINI_WIDTH = 400;
export const MINI_HEIGHT = 152;

export type MiniCommand =
  | 'toggle'
  | 'reset'
  | 'skip'
  | 'toggle-sound'
  /** The mini window saw the countdown reach zero; main should re-check the clock. */
  | 'sync'
  | 'focus-main'
  | 'request-state'
  | 'closed';

export interface MiniPrefs {
  alwaysOnTop: boolean;
  pinned: boolean;
  /** Logical screen position of the mini window. */
  x?: number;
  y?: number;
}

const PREFS_KEY = 'focusspace_mini_prefs';
const DEFAULT_PREFS: MiniPrefs = { alwaysOnTop: true, pinned: false };

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function loadMiniPrefs(): MiniPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<MiniPrefs>;
    return {
      alwaysOnTop: typeof parsed.alwaysOnTop === 'boolean' ? parsed.alwaysOnTop : DEFAULT_PREFS.alwaysOnTop,
      pinned: typeof parsed.pinned === 'boolean' ? parsed.pinned : DEFAULT_PREFS.pinned,
      x: typeof parsed.x === 'number' ? parsed.x : undefined,
      y: typeof parsed.y === 'number' ? parsed.y : undefined
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveMiniPrefs(patch: Partial<MiniPrefs>): MiniPrefs {
  const next = { ...loadMiniPrefs(), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

// ── Main window side ──────────────────────────────────────────────────

/** Opens (or focuses) the frameless mini-player window. Resolves once it exists. */
export async function openDesktopMini(onDestroyed: () => void): Promise<void> {
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const existing = await WebviewWindow.getByLabel(MINI_WINDOW_LABEL);
  if (existing) {
    await existing.setFocus();
    return;
  }

  const prefs = loadMiniPrefs();
  const hasPosition = typeof prefs.x === 'number' && typeof prefs.y === 'number';
  const mini = new WebviewWindow(MINI_WINDOW_LABEL, {
    // App-relative, so it resolves to the dev server or the bundled UI alike.
    url: `index.html${MINI_WINDOW_HASH}`,
    title: 'Focus Space · Mini player',
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    ...(hasPosition ? { x: prefs.x, y: prefs.y } : { center: true }),
    resizable: false,
    maximizable: false,
    minimizable: false,
    decorations: false,
    alwaysOnTop: prefs.alwaysOnTop,
    skipTaskbar: false,
    shadow: true,
    focus: true
  });

  await new Promise<void>((resolve, reject) => {
    mini.once('tauri://created', () => resolve());
    mini.once('tauri://error', e => reject(e));
  });
  mini.once('tauri://destroyed', () => onDestroyed());
}

/**
 * Re-attaches to a mini window that outlived a main-window reload.
 * Returns true when one exists (and wires its destroy handler).
 */
export async function attachExistingDesktopMini(onDestroyed: () => void): Promise<boolean> {
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const existing = await WebviewWindow.getByLabel(MINI_WINDOW_LABEL);
  if (!existing) return false;
  existing.once('tauri://destroyed', () => onDestroyed());
  return true;
}

export async function closeDesktopMini(): Promise<void> {
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const existing = await WebviewWindow.getByLabel(MINI_WINDOW_LABEL);
  await existing?.close();
}

export async function sendSnapshotToMini(snapshot: TimerSnapshot): Promise<void> {
  const { emitTo } = await import('@tauri-apps/api/event');
  await emitTo(MINI_WINDOW_LABEL, EVT_TIMER_STATE, snapshot);
}

export async function listenForMiniCommands(handler: (cmd: MiniCommand) => void): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  return listen<MiniCommand>(EVT_TIMER_COMMAND, e => handler(e.payload));
}

export async function focusMainWindow(): Promise<void> {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  await win.unminimize();
  await win.show();
  await win.setFocus();
}

// ── Mini window side ──────────────────────────────────────────────────

export async function sendCommandToMain(cmd: MiniCommand): Promise<void> {
  const { emitTo } = await import('@tauri-apps/api/event');
  await emitTo('main', EVT_TIMER_COMMAND, cmd);
}

export async function listenForSnapshots(handler: (s: TimerSnapshot) => void): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  return listen<TimerSnapshot>(EVT_TIMER_STATE, e => handler(e.payload));
}

export async function setMiniAlwaysOnTop(value: boolean): Promise<void> {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().setAlwaysOnTop(value);
}

export async function closeCurrentWindow(): Promise<void> {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().close();
}

/** Persists the mini window's position (logical px) whenever it moves. */
export async function trackMiniPosition(): Promise<() => void> {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  let timer: number | undefined;
  return win.onMoved(({ payload }) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      const factor = await win.scaleFactor();
      saveMiniPrefs({ x: Math.round(payload.x / factor), y: Math.round(payload.y / factor) });
    }, 250);
  });
}
