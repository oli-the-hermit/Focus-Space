/**
 * Desktop (Tauri) integration for the mini player.
 *
 * Tauri modules are imported lazily so the plain browser build never loads them.
 * Main and mini windows talk over two events:
 *   - EVT_TIMER_STATE   main → mini   TimerSnapshot on every change
 *   - EVT_TIMER_COMMAND mini → main   MiniCommand (controls, sync, lifecycle)
 */
import type { TimerSnapshot } from './timerSnapshot';
import { EVT_ALERT_ACTION, type AlertActionMessage, type AlertPayload } from './notify';
import { strings } from '../constants/strings';
import { storage } from './storage';

export const MINI_WINDOW_LABEL = 'mini';
/** URL hash that makes `main.tsx` render the mini player instead of the app. */
export const MINI_WINDOW_HASH = '#mini';
export const EVT_TIMER_STATE = 'fs:timer-state';
export const EVT_TIMER_COMMAND = 'fs:timer-command';

export const MINI_WIDTH = 400;
export const MINI_HEIGHT = 152;
/** Smallest size that still fits the compact row layout. */
export const MINI_MIN_WIDTH = 260;
export const MINI_MIN_HEIGHT = 120;

export type MiniCommand =
  | 'toggle'
  | 'reset'
  | 'skip'
  | 'toggle-sound'
  /** The mini window saw the countdown reach zero; main should re-check the clock. */
  | 'sync'
  | 'focus-main'
  | 'request-state'
  | 'closed'
  /** The mini player's task rows: the same changes as the app's task list. */
  | { type: 'add-task'; listId: string; text: string }
  | { type: 'toggle-task'; listId: string; taskId: string; checked: boolean }
  | { type: 'rename-task'; listId: string; taskId: string; text: string }
  | { type: 'duplicate-task'; listId: string; taskId: string }
  | { type: 'delete-task'; listId: string; taskId: string }
  | { type: 'reorder-tasks'; listId: string; sourceId: string; targetId: string };

export interface MiniPrefs {
  alwaysOnTop: boolean;
  pinned: boolean;
  /** Logical screen position of the mini window. */
  x?: number;
  y?: number;
  /** Logical size, remembered after the user resizes it. */
  width?: number;
  height?: number;
}

const DEFAULT_PREFS: MiniPrefs = { alwaysOnTop: true, pinned: false };

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function loadMiniPrefs(): MiniPrefs {
  const parsed = storage.getJSON<Partial<MiniPrefs>>('miniPrefs');
  if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PREFS };
  return {
    alwaysOnTop: typeof parsed.alwaysOnTop === 'boolean' ? parsed.alwaysOnTop : DEFAULT_PREFS.alwaysOnTop,
    pinned: typeof parsed.pinned === 'boolean' ? parsed.pinned : DEFAULT_PREFS.pinned,
    x: typeof parsed.x === 'number' ? parsed.x : undefined,
    y: typeof parsed.y === 'number' ? parsed.y : undefined,
    width: typeof parsed.width === 'number' ? parsed.width : undefined,
    height: typeof parsed.height === 'number' ? parsed.height : undefined
  };
}

export function saveMiniPrefs(patch: Partial<MiniPrefs>): MiniPrefs {
  const next = { ...loadMiniPrefs(), ...patch };
  storage.setJSON('miniPrefs', next);
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
    title: strings.mini.windowTitle,
    width: Math.max(MINI_MIN_WIDTH, prefs.width ?? MINI_WIDTH),
    height: Math.max(MINI_MIN_HEIGHT, prefs.height ?? MINI_HEIGHT),
    minWidth: MINI_MIN_WIDTH,
    minHeight: MINI_MIN_HEIGHT,
    ...(hasPosition ? { x: prefs.x, y: prefs.y } : { center: true }),
    // Resizing switches between the compact, tall and wide layouts (mini.css).
    resizable: true,
    maximizable: false,
    minimizable: false,
    decorations: false,
    alwaysOnTop: prefs.alwaysOnTop,
    skipTaskbar: false,
    shadow: true,
    focus: true,
    // Tauri's file-drop handler would swallow HTML5 drag events.
    dragDropEnabled: false
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

/** Persists the mini window's size (logical px) after the user resizes it. */
export async function trackMiniSize(): Promise<() => void> {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  let timer: number | undefined;
  return win.onResized(({ payload }) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      const factor = await win.scaleFactor();
      saveMiniPrefs({ width: Math.round(payload.width / factor), height: Math.round(payload.height / factor) });
    }, 250);
  });
}

// ── Frameless window controls (main window) ───────────────────────────

export async function minimizeWindow(): Promise<void> {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().minimize();
}

export async function toggleMaximizeWindow(): Promise<void> {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().toggleMaximize();
}

/** Calls `handler` with the maximized state now and after every resize. */
export async function watchMaximized(handler: (maximized: boolean) => void): Promise<() => void> {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  handler(await win.isMaximized());
  return win.onResized(async () => handler(await win.isMaximized()));
}

// ── External links ────────────────────────────────────────────────────

/** Opens a URL in the user's default browser (never inside the app window). */
export async function openExternal(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ── Alerts (see src-tauri/src/alerts.rs) ──────────────────────────────

export const ISLAND_WINDOW_HASH = '#island';
const EVT_ALERT_FIRED = 'fs:alert-fired';
const EVT_ALERT_SHOW = 'fs:alert-show';

export interface AlertFiredEvent {
  payload: AlertPayload;
  /** Main was focused, so no island window was opened: show the alert in-app. */
  inFront: boolean;
}

async function invokeCmd<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

/** Asks Rust to fire `payload` at `atMs`; replaces any alert already scheduled. */
export function scheduleDesktopAlert(atMs: number, payload: AlertPayload): Promise<void> {
  return invokeCmd('schedule_phase_alert', { atMs: Math.round(atMs), payload });
}

export function cancelDesktopAlert(): Promise<void> {
  return invokeCmd('cancel_phase_alert');
}

export function showDesktopAlert(payload: AlertPayload): Promise<void> {
  return invokeCmd('show_alert', { payload });
}

export function takePendingAlert(): Promise<AlertPayload | null> {
  return invokeCmd<AlertPayload | null>('take_pending_alert');
}

export async function listenForAlertFired(handler: (e: AlertFiredEvent) => void): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  return listen<AlertFiredEvent>(EVT_ALERT_FIRED, e => handler(e.payload));
}

/** Island window: a new alert arrived while it was already open. */
export async function listenForAlertShow(handler: (p: AlertPayload) => void): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  return listen<AlertPayload>(EVT_ALERT_SHOW, e => handler(e.payload));
}

export async function sendAlertAction(msg: AlertActionMessage): Promise<void> {
  const { emitTo } = await import('@tauri-apps/api/event');
  await emitTo('main', EVT_ALERT_ACTION, msg);
}

export async function listenForAlertActions(handler: (msg: AlertActionMessage) => void): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event');
  return listen<AlertActionMessage>(EVT_ALERT_ACTION, e => handler(e.payload));
}
