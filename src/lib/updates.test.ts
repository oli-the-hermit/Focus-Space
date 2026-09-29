import { describe, expect, it, vi } from 'vitest';
import { createUpdateStore, type UpdateBackend } from './updates';

const available = { status: 'available' as const, current: '1.1.0', version: '1.2.0' };

function fakeBackend(overrides: Partial<UpdateBackend> = {}): UpdateBackend {
  return {
    check: vi.fn(async () => available),
    install: vi.fn(async onEvent => {
      onEvent({ event: 'progress', downloaded: 50, total: 200 });
      onEvent({ event: 'progress', downloaded: 200, total: 200 });
      onEvent({ event: 'finished' });
    }),
    ...overrides
  };
}

describe('update store', () => {
  it('finds an update, downloads with progress and restarts', async () => {
    const store = createUpdateStore(fakeBackend());
    const seen: string[] = [];
    store.subscribe(() => {
      const s = store.getSnapshot().state;
      seen.push(s.phase === 'downloading' ? `downloading ${s.progress}` : s.phase);
    });
    await store.check();
    expect(store.getSnapshot().state).toEqual({ phase: 'available', current: '1.1.0', version: '1.2.0' });
    await store.install();
    expect(seen).toEqual(['checking', 'available', 'downloading null', 'downloading 0.25', 'downloading 1', 'restarting', 'restarting']);
  });

  it('reports up to date and ignores install', async () => {
    const backend = fakeBackend({ check: async () => ({ status: 'upToDate', current: '1.1.0' }) });
    const store = createUpdateStore(backend);
    await store.check();
    expect(store.getSnapshot().state).toEqual({ phase: 'upToDate', current: '1.1.0' });
    await store.install();
    expect(backend.install).not.toHaveBeenCalled();
  });

  it('shows a failed check, and stays quiet when updates are off in this build', async () => {
    const failing = createUpdateStore(fakeBackend({ check: async () => { throw new Error('CHECK_FAILED'); } }));
    await failing.check();
    expect(failing.getSnapshot().state).toEqual({ phase: 'failed', step: 'check' });

    const disabled = createUpdateStore(fakeBackend({ check: async () => ({ status: 'disabled' }) }));
    await disabled.check();
    expect(disabled.getSnapshot().state).toEqual({ phase: 'idle' });
  });

  it('retries a failed install by looking for the update again', async () => {
    let attempts = 0;
    const backend = fakeBackend({
      install: vi.fn(async () => {
        attempts++;
        if (attempts === 1) throw new Error('INSTALL_FAILED');
      })
    });
    const store = createUpdateStore(backend);
    await store.check();
    await store.install();
    expect(store.getSnapshot().state).toEqual({ phase: 'failed', step: 'install', version: '1.2.0' });
    await store.install();
    expect(backend.check).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().state).toEqual({ phase: 'restarting', version: '1.2.0' });
  });

  it('remembers "Maybe later" for this launch and the notify switch per device', () => {
    const store = createUpdateStore(fakeBackend());
    expect(store.getSnapshot()).toMatchObject({ postponed: false, notify: true });
    store.postpone();
    store.setNotify(false);
    expect(store.getSnapshot()).toMatchObject({ postponed: true, notify: false });
  });
});
