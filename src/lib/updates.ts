/**
 * Desktop app updates: one small store shared by the launch card
 * (shell/UpdateNotice) and Settings > Updates. Rust does the work
 * (src-tauri/src/updates.rs); this tracks where the update is and whether the
 * user wants to hear about it. The web build never checks.
 */
import { useSyncExternalStore } from 'react';
import { storage } from './storage';

export type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'upToDate'; current: string }
  | { phase: 'available'; current: string; version: string }
  /** progress is 0–1, or null while the size isn't known. */
  | { phase: 'downloading'; version: string; progress: number | null }
  /** Downloaded and verified; the installer takes over and reopens the app. */
  | { phase: 'restarting'; version: string }
  | { phase: 'failed'; step: 'check' | 'install'; version?: string };

type CheckResult =
  | { status: 'disabled' }
  | { status: 'upToDate'; current: string }
  | { status: 'available'; current: string; version: string };

type DownloadEvent = { event: 'progress'; downloaded: number; total: number | null } | { event: 'finished' };

/** What the store needs from the desktop app; tests pass a fake. */
export interface UpdateBackend {
  check(): Promise<CheckResult>;
  install(onEvent: (e: DownloadEvent) => void): Promise<void>;
}

export const tauriUpdateBackend: UpdateBackend = {
  async check() {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<CheckResult>('check_for_update');
  },
  async install(onEvent) {
    const { invoke, Channel } = await import('@tauri-apps/api/core');
    const channel = new Channel<DownloadEvent>();
    channel.onmessage = onEvent;
    await invoke('install_update', { onEvent: channel });
  }
};

export function createUpdateStore(backend: UpdateBackend) {
  let state: UpdateState = { phase: 'idle' };
  /** "Maybe later" on the launch card: hidden until the next launch. */
  let postponed = false;
  let notify = storage.get('updateNotify') !== 'off';
  const listeners = new Set<() => void>();
  let snapshot: { state: UpdateState; postponed: boolean; notify: boolean } = { state, postponed, notify };

  const emit = () => {
    snapshot = { state, postponed, notify };
    listeners.forEach(l => l());
  };
  const set = (next: UpdateState) => {
    state = next;
    emit();
  };

  const check = async () => {
    if (state.phase === 'checking' || state.phase === 'downloading' || state.phase === 'restarting') return;
    set({ phase: 'checking' });
    try {
      const res = await backend.check();
      if (res.status === 'available') set({ phase: 'available', current: res.current, version: res.version });
      else if (res.status === 'upToDate') set({ phase: 'upToDate', current: res.current });
      else set({ phase: 'idle' });
    } catch {
      set({ phase: 'failed', step: 'check' });
    }
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    check,

    async install() {
      // A failed install used up the found update (Rust hands it out once): look again first.
      if (state.phase === 'failed' && state.step === 'install') await check();
      const current = state as UpdateState;
      if (current.phase !== 'available') return;
      const version = current.version;
      set({ phase: 'downloading', version, progress: null });
      try {
        let received = 0;
        await backend.install(e => {
          if (e.event === 'progress') {
            received = e.downloaded;
            set({ phase: 'downloading', version, progress: e.total ? Math.min(1, received / e.total) : null });
          } else {
            set({ phase: 'restarting', version });
          }
        });
        set({ phase: 'restarting', version });
      } catch {
        set({ phase: 'failed', step: 'install', version });
      }
    },

    postpone() {
      postponed = true;
      emit();
    },

    setNotify(on: boolean) {
      notify = on;
      if (on) storage.remove('updateNotify');
      else storage.set('updateNotify', 'off');
      emit();
    }
  };
}

export type UpdateStore = ReturnType<typeof createUpdateStore>;

/** The app's store (desktop). */
export const updateStore = createUpdateStore(tauriUpdateBackend);

export function useUpdates(store: UpdateStore = updateStore) {
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { ...snap, store };
}
