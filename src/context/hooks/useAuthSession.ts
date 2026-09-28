import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { AppState, Profile } from '../../types';
import { api } from '../../lib/api';
import { deriveDataKey, decryptBlob, randomSaltHex, exportRawKey, importRawKey } from '../../lib/crypto';
import { sealState } from '../../lib/persistence';
import { strings } from '../../constants/strings';
import { clearTimerRun, loadTimerRun, storage } from '../../lib/storage';
import { TIMING } from '../../constants/timing';
import { normalizeState } from '../../lib/normalize';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

interface AuthDataResponse {
  salt: string;
  iv: string;
  cipher: string;
}

interface AuthResponse {
  token: string;
  profile: Profile;
  data: AuthDataResponse;
}

interface AuthSessionDeps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showToast: (message: string) => void;
  targetEndTimeRef: React.MutableRefObject<number | null>;
  /** Resets UI state (tab, tour, help, alert) after signing out. */
  onSignedOut: () => void;
}

/**
 * Sign-in state and the encrypted data layer: restores the session on startup,
 * auto-saves the sealed state (debounced), and the auth actions.
 */
export function useAuthSession({ state, setState, showToast, targetEndTimeRef, onSignedOut }: AuthSessionDeps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const tokenRef = useRef<string | null>(null);
  const dataKeyRef = useRef<CryptoKey | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const authStatusRef = useRef<AuthStatus>('loading');
  authStatusRef.current = authStatus;

  // Auto-authenticate & restore persistent session on startup
  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      try {
        const storedToken = storage.get('authToken');
        const storedKeyMaterial = storage.get('authKey');

        if (!storedToken || !storedKeyMaterial) {
          if (!cancelled) setAuthStatus('unauthenticated');
          return;
        }

        const key = await importRawKey(storedKeyMaterial);
        tokenRef.current = storedToken;
        dataKeyRef.current = key;

        const [meRes, dataRes] = await Promise.all([
          api.get<{ profile: Profile }>('/api/auth/me', storedToken),
          api.get<AuthDataResponse>('/api/data', storedToken)
        ]);

        let nextState = normalizeState(null);
        if (dataRes.cipher && dataRes.iv) {
          const plain = await decryptBlob({ iv: dataRes.iv, cipher: dataRes.cipher }, key);
          nextState = normalizeState(JSON.parse(plain));
        }

        // Restore active running timer if valid
        const runInfo = loadTimerRun();
        if (runInfo) {
          const now = Date.now();
          if (runInfo.targetEndTime > now) {
            const remainingSecs = Math.max(1, Math.ceil((runInfo.targetEndTime - now) / 1000));
            nextState = {
              ...nextState,
              timer: {
                ...nextState.timer,
                phase: runInfo.phase,
                status: 'running',
                remaining: remainingSecs,
                total: runInfo.total || nextState.timer.total
              }
            };
            targetEndTimeRef.current = runInfo.targetEndTime;
          } else {
            clearTimerRun();
          }
        }

        if (!cancelled) {
          setProfile(meRes.profile);
          setState(nextState);
          setAuthStatus('authenticated');
        }
      } catch {
        if (!cancelled) {
          storage.remove('authToken', 'authKey', 'timerRun');
          tokenRef.current = null;
          dataKeyRef.current = null;
          targetEndTimeRef.current = null;
          setProfile(null);
          setAuthStatus('unauthenticated');
        }
      }
    };

    bootstrapAuth();
    return () => {
      cancelled = true;
    };
    // Both are stable (a state setter and a ref), so this runs once on mount.
  }, [setState, targetEndTimeRef]);

  // Encrypted persistence (debounced) — only when authenticated
  useEffect(() => {
    if (authStatus !== 'authenticated' || !dataKeyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      const token = tokenRef.current;
      const key = dataKeyRef.current;
      if (!token || !key || authStatusRef.current !== 'authenticated') return;
      try {
        const sealed = await sealState(state, key);
        await api.put('/api/data', sealed, token);
      } catch (err) {
        console.warn('Failed to persist data:', err);
      }
    }, TIMING.saveDebounceMs);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, authStatus]);

  // ── Auth actions ─────────────────────────────────────────────────────
  const login = async (username: string, password: string) => {
    const res = await api.post<AuthResponse>('/api/auth/login', { username, password });
    tokenRef.current = res.token;
    let next = normalizeState(null);
    let key: CryptoKey;
    if (res.data.cipher && res.data.iv) {
      key = await deriveDataKey(password, res.data.salt);
      const plain = await decryptBlob({ iv: res.data.iv, cipher: res.data.cipher }, key);
      next = normalizeState(JSON.parse(plain));
    } else {
      key = await deriveDataKey(password, res.data.salt);
    }
    dataKeyRef.current = key;
    const rawKeyB64 = await exportRawKey(key);
    storage.set('authToken', res.token);
    storage.set('authKey', rawKeyB64);
    setProfile(res.profile);
    setAuthStatus('authenticated');
    setState(next);
  };

  const setup = async (username: string, displayName: string, password: string) => {
    const legacyRaw = storage.get('legacyData');
    const res = await api.post<AuthResponse>('/api/auth/setup', { username, displayName, password });
    tokenRef.current = res.token;
    const key = await deriveDataKey(password, res.data.salt);
    dataKeyRef.current = key;
    const rawKeyB64 = await exportRawKey(key);
    storage.set('authToken', res.token);
    storage.set('authKey', rawKeyB64);

    let next = normalizeState(null);
    let migrated = false;
    if (legacyRaw) {
      try {
        next = normalizeState(JSON.parse(legacyRaw));
        storage.remove('legacyData');
        migrated = true;
      } catch {
        // Fall back to fresh defaults
      }
    }
    setProfile(res.profile);
    setAuthStatus('authenticated');
    setState(next);
    showToast(migrated ? strings.toasts.dataImported : strings.toasts.setupComplete);
  };

  const logout = async () => {
    const token = tokenRef.current;
    const key = dataKeyRef.current;
    if (token && key && authStatus === 'authenticated') {
      try {
        const sealed = await sealState(state, key);
        await api.put('/api/data', sealed, token);
      } catch {
        // Best effort: every change was already auto-saved; this only flushes the last one.
      }
    }
    if (token) {
      try {
        await api.post('/api/auth/logout', {}, token);
      } catch {
        // Signing out locally must work even when the server can't be reached.
      }
    }
    storage.remove('authToken', 'authKey', 'timerRun');
    tokenRef.current = null;
    dataKeyRef.current = null;
    targetEndTimeRef.current = null;
    setProfile(null);
    setAuthStatus('unauthenticated');
    onSignedOut();
    setState(() => normalizeState(null));
  };

  const deleteOwnProfile = async (password: string) => {
    await api.del('/api/profile', { password }, tokenRef.current);
    storage.remove('authToken', 'authKey', 'timerRun');
    tokenRef.current = null;
    dataKeyRef.current = null;
    targetEndTimeRef.current = null;
    setProfile(null);
    setAuthStatus('unauthenticated');
    setState(() => normalizeState(null));
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const key = dataKeyRef.current;
    const token = tokenRef.current;
    if (!key || !token || authStatus !== 'authenticated') {
      throw new Error(strings.errors.api.SESSION_EXPIRED);
    }
    // Flush any pending save so stale ciphertext (old key) can't overwrite the re-encrypted blob
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    // Re-encrypt the whole blob under a fresh salt + new password-derived key
    const newSalt = randomSaltHex();
    const newKey = await deriveDataKey(newPassword, newSalt);
    const sealed = await sealState(state, newKey);
    const res = await api.put<AuthResponse>(
      '/api/profile/password',
      {
        currentPassword,
        newPassword,
        salt: newSalt,
        iv: sealed.iv,
        cipher: sealed.cipher
      },
      token
    );
    tokenRef.current = res.token;
    dataKeyRef.current = newKey;
    const rawKeyB64 = await exportRawKey(newKey);
    storage.set('authToken', res.token);
    storage.set('authKey', rawKeyB64);
    setProfile(res.profile);
    showToast(strings.profile.passwordChangedMsg);
  };

  const refreshProfile = (updated: Profile) => setProfile(updated);

  return { authStatus, profile, tokenRef, login, setup, logout, deleteOwnProfile, changePassword, refreshProfile };
}
