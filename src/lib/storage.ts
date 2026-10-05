/**
 * The app's localStorage, in one place: every key it uses, and access that never
 * throws. localStorage can be unavailable (private windows, blocked storage, a
 * full quota); reads then return null and writes are skipped, which is the right
 * fallback for everything stored here (caches, preferences, the session token).
 */
import type { TimerPhase } from '../types';

export const STORAGE_KEYS = {
  /** Pre-account data from the first version, migrated into the profile on sign-in. */
  legacyData: 'focusspace_v1',
  themeCache: 'focusspace_theme_cache',
  /** The last accent, like the theme cache: other windows and the sign-in screen paint it first. */
  accentCache: 'focusspace_accent_cache',
  /** The last few accents picked on this device (Appearance > Recent colors). */
  recentAccents: 'focusspace_recent_accents',
  /** Emoji picked in the emoji picker on this device, newest first (its Recent tab). */
  recentEmoji: 'focusspace_recent_emoji',
  authToken: 'focusspace_auth_token',
  authKey: 'focusspace_auth_key',
  timerRun: 'focusspace_timer_run',
  miniPrefs: 'focusspace_mini_prefs',
  /** 'off' when the user turned off update notices (Settings > Updates). Per device. */
  updateNotify: 'focusspace_update_notify',
  /** 'expanded' when the navigation drawer shows labels beside the icons; else the rail. Per device. */
  drawer: 'focusspace_drawer'
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;

export const storage = {
  get(key: StorageKey): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS[key]);
    } catch {
      return null;
    }
  },

  set(key: StorageKey, value: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS[key], value);
    } catch {
      // Storage unavailable or full: nothing to persist to.
    }
  },

  remove(...keys: StorageKey[]): void {
    for (const key of keys) {
      try {
        localStorage.removeItem(STORAGE_KEYS[key]);
      } catch {
        // Storage unavailable: nothing to remove.
      }
    }
  },

  /** Parsed JSON, or null when missing or unreadable. */
  getJSON<T>(key: StorageKey): T | null {
    const raw = storage.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  setJSON(key: StorageKey, value: unknown): void {
    storage.set(key, JSON.stringify(value));
  }
};

/** A running timer, saved so a reload or restart picks it up where it was. */
export interface PersistedTimerRun {
  targetEndTime: number;
  phase: TimerPhase;
  sessionId: string | null;
  total: number;
}

export const loadTimerRun = (): PersistedTimerRun | null => storage.getJSON<PersistedTimerRun>('timerRun');
export const saveTimerRun = (run: PersistedTimerRun): void => storage.setJSON('timerRun', run);
export const clearTimerRun = (): void => storage.remove('timerRun');

/** How many emoji the picker's Recent tab keeps (three rows). */
export const RECENT_EMOJI_MAX = 24;

export function loadRecentEmoji(): string[] {
  const v = storage.getJSON<unknown[]>('recentEmoji');
  return Array.isArray(v) ? v.filter((e): e is string => typeof e === 'string' && e !== '') : [];
}

/** Remembers a picked emoji and returns the updated list. */
export function pushRecentEmoji(emoji: string): string[] {
  const next = [emoji, ...loadRecentEmoji().filter(e => e !== emoji)].slice(0, RECENT_EMOJI_MAX);
  storage.setJSON('recentEmoji', next);
  return next;
}
