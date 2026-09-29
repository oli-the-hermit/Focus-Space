import type { AppState } from '../types';
import { encryptBlob, type SealedBlob } from './crypto';

/**
 * The state as it's saved. A running timer is stored as idle: the live run is
 * restored from its own record (loadTimerRun in lib/storage) instead.
 */
export function stateForSave(state: AppState): AppState {
  return { ...state, timer: { ...state.timer, status: 'idle', endsAt: null } };
}

/** Encrypts the saveable state with the profile's data key. */
export function sealState(state: AppState, key: CryptoKey): Promise<SealedBlob> {
  return encryptBlob(JSON.stringify(stateForSave(state)), key);
}
