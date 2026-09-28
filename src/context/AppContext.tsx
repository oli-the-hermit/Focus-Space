import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import {
  AppState,
  TabType,
  Session,
  Goal,
  Landmark,
  Reward,
  CalendarEvent,
  TimerPhase,
  CalendarView,
  NotificationSettings,
  ModalType,
  ModalPayloadMap,
  ActiveModal,
  Profile,
  ThemeMode,
  NewReward
} from '../types';
import { api } from '../lib/api';
import { deriveDataKey, decryptBlob, randomSaltHex, exportRawKey, importRawKey } from '../lib/crypto';
import { sealState } from '../lib/persistence';
import { strings } from '../constants/strings';
import { getTodayStr } from '../lib/dateUtils';
import { startTicker } from '../lib/ticker';
import {
  AlertActionId,
  AlertActionMessage,
  AlertPayload,
  SW_ALERT_MESSAGE,
  buildEventAlert,
  buildPhaseAlert,
  pageIsInFront,
  registerAlertWorker,
  showWebNotification
} from '../lib/notify';
import {
  cancelDesktopAlert,
  focusMainWindow,
  isTauri,
  listenForAlertActions,
  listenForAlertFired,
  scheduleDesktopAlert,
  showDesktopAlert
} from '../lib/desktop';
import { clearTimerRun, loadTimerRun, saveTimerRun, storage } from '../lib/storage';
import { applyTheme, cacheTheme, cachedTheme, cssDurationMs } from '../lib/theme';
import { playChime as playPhaseChime } from '../lib/audio';
import { TIMING } from '../constants/timing';
import { normalizeState } from '../lib/normalize';
import { createSessionActions } from './actions/sessions';
import { createListActions } from './actions/lists';
import { createCalendarActions } from './actions/calendar';
import { createGoalActions } from './actions/goals';
import { createRewardActions } from './actions/rewards';
import { uid } from '../lib/id';
import { phaseMinutes } from '../lib/sessionTime';

interface ToastItem {
  id: string;
  message: string;
  /** Playing its exit animation; removed shortly after. */
  leaving?: boolean;
}


interface AppContextType {
  state: AppState;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  toasts: ToastItem[];
  showToast: (msg: string) => void;
  activeCelebrationReward: Reward | null;
  dismissCelebration: () => void;

  // Modal System
  activeModal: ActiveModal | null;
  openModal: <K extends ModalType>(
    type: K,
    ...args: undefined extends ModalPayloadMap[K] ? [payload?: ModalPayloadMap[K]] : [payload: ModalPayloadMap[K]]
  ) => void;
  closeModal: () => void;

  // Timer Actions
  toggleTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  toggleSound: () => void;
  /** Re-reads the wall clock and completes the phase if it has elapsed. */
  syncTimer: () => void;
  /** Epoch ms at which the running phase ends, or null when not running. */
  getTimerTargetEnd: () => number | null;

  // Drag & Drop Reordering
  reorderSessions: (sourceId: string, targetId: string) => void;
  reorderTaskLists: (sourceId: string, targetId: string) => void;
  reorderTasks: (listId: string, sourceId: string, targetId: string) => void;
  moveCalendarEvent: (eventId: string, targetDate: string, targetTime: string) => void;

  // Sessions CRUD
  setActiveSession: (id: string) => void;
  createSession: (session: Omit<Session, 'id'>) => string;
  updateSession: (id: string, session: Partial<Session>) => void;
  duplicateSession: (id: string) => void;
  deleteSession: (id: string) => void;
  setSessionTaskLists: (sessionId: string, listIds: string[]) => void;

  // Lists CRUD
  setActiveList: (id: string) => void;
  createList: (name: string, options?: { activate?: boolean }) => string;
  renameList: (id: string, name: string) => void;
  duplicateList: (id: string) => void;
  deleteList: (id: string) => void;
  setSelectedListForTimer: (id: string | null) => void;

  // Tasks CRUD
  addTask: (listId: string, text: string) => void;
  toggleTask: (listId: string, taskId: string, checked: boolean) => void;
  renameTask: (listId: string, taskId: string, newText: string) => void;
  duplicateTask: (listId: string, taskId: string) => void;
  deleteTask: (listId: string, taskId: string) => void;

  // Calendar CRUD
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateCalendarEvent: (id: string, event: Partial<CalendarEvent>) => void;
  duplicateCalendarEvent: (id: string) => void;
  deleteCalendarEvent: (id: string) => void;
  setCalendarView: (view: CalendarView) => void;
  setCalendarDate: (date: string) => void;

  // Goals CRUD
  addGoal: (goal: Omit<Goal, 'id' | 'completed'>) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  duplicateGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  toggleGoal: (id: string) => void;
  addLandmark: (goalId: string, landmark: Omit<Landmark, 'id'>) => void;
  updateLandmark: (goalId: string, landmarkId: string, landmark: Partial<Landmark>) => void;
  duplicateLandmark: (goalId: string, landmarkId: string) => void;
  deleteLandmark: (goalId: string, landmarkId: string) => void;
  toggleLandmark: (goalId: string, landmarkId: string) => void;

  // Rewards CRUD
  addReward: (reward: NewReward) => string;
  updateReward: (id: string, reward: Partial<Reward>) => void;
  duplicateReward: (id: string) => void;
  deleteReward: (id: string) => void;
  claimReward: (id: string) => void;

  // Notifications
  updateNotifications: (settings: Partial<NotificationSettings>) => void;

  // Auth & Profiles
  authStatus: AuthStatus;
  profile: Profile | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setup: (username: string, displayName: string, password: string) => Promise<void>;
  refreshProfile: (profile: Profile) => void;
  deleteOwnProfile: (password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // Appearance
  updateTheme: (theme: ThemeMode) => void;

  // Onboarding & help
  tourActive: boolean;
  startTour: () => void;
  endTour: () => void;
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;

  // Alerts
  /** The bell rings for a few seconds after a phase ends. */
  alertRinging: boolean;
  /** Alert shown in-app as an island (app in front). */
  activeAlert: AlertPayload | null;
  dismissAlert: () => void;
  runAlertAction: (action: AlertActionId, payload?: AlertPayload | null) => void;
}

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

/** True when the user asked the OS for less motion. */
function prefersReducedMotion(): boolean {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}


const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<TabType>('timer');
  const activeTabRef = useRef<TabType>('timer');
  activeTabRef.current = activeTab;
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [tourActive, setTourActive] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [alertRinging, setAlertRinging] = useState(false);
  const [activeAlert, setActiveAlert] = useState<AlertPayload | null>(null);
  const ringingTimerRef = useRef<number | undefined>(undefined);

  // Page changes cross-fade with the View Transitions API where available
  // (Chromium / WebView2); the nav indicator slides as a shared element.
  const setActiveTab = (tab: TabType) => {
    if (tab === activeTabRef.current) return;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !prefersReducedMotion() && document.visibilityState === 'visible') {
      doc.startViewTransition(() => flushSync(() => setActiveTabState(tab)));
    } else {
      setActiveTabState(tab);
    }
  };
  const [activeCelebrationReward, setActiveCelebrationReward] = useState<Reward | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

  const [state, setState] = useState<AppState>(() => normalizeState(null));

  // ── Auth & encrypted data layer ──────────────────────────────────────
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const tokenRef = useRef<string | null>(null);
  const dataKeyRef = useRef<CryptoKey | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const authStatusRef = useRef<AuthStatus>('loading');
  authStatusRef.current = authStatus;
  const targetEndTimeRef = useRef<number | null>(null);

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
  }, []);

  // Theme bootstrap (cached) + application
  useEffect(() => {
    const cached = cachedTheme();
    if (cached) applyTheme(cached);
  }, []);

  useEffect(() => {
    applyTheme(state.theme);
    cacheTheme(state.theme);
  }, [state.theme]);

  useEffect(() => {
    if (state.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [state.theme]);

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

  const showToast = (message: string) => {
    const id = uid();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
      // Removed once the slide-out transition (--dur-2 in toast.css) has played.
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), cssDurationMs('--dur-2'));
    }, TIMING.toastVisibleMs);
  };

  const openModal = ((type: ModalType, payload?: unknown) => {
    setActiveModal({ type, payload } as ActiveModal);
  }) as AppContextType['openModal'];

  const closeModal = () => {
    setActiveModal(null);
  };

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
    setActiveTabState('timer');
    setTourActive(false);
    setHelpOpen(false);
    setActiveAlert(null);
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

  const updateTheme = (theme: ThemeMode) => {
    setState(prev => ({ ...prev, theme }));
  };

  const playChime = (phase: TimerPhase = 'focus') => {
    if (state.sound) playPhaseChime(phase);
  };

  const ringBell = () => {
    window.clearTimeout(ringingTimerRef.current);
    setAlertRinging(true);
    ringingTimerRef.current = window.setTimeout(() => setAlertRinging(false), TIMING.alertRingingMs);
  };

  /**
   * Web delivery: an island inside the page when it's in front, otherwise a
   * browser notification (with buttons). Desktop alerts are routed by Rust.
   */
  const deliverAlert = (payload: AlertPayload) => {
    if (isTauri()) {
      showDesktopAlert(payload).catch(() => setActiveAlert(payload));
      return;
    }
    if (pageIsInFront()) {
      setActiveAlert(payload);
      return;
    }
    showWebNotification(payload).then(shown => {
      if (!shown) setActiveAlert(payload);
    });
  };

  // Phase completion handler
  const handlePhaseComplete = (skipped = false) => {
    targetEndTimeRef.current = null;
    clearTimerRun();
    const currentSession = state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0];
    const isFocus = state.timer.phase === 'focus';

    if (isFocus) {
      if (!skipped) {
        playChime('focus');
        announcePhaseEnd('focus');

        // Unlock session rewards
        if (currentSession) {
          setState(prev => ({
            ...prev,
            rewards: prev.rewards.map(r => {
              const isLinked =
                (currentSession.rewardId && r.id === currentSession.rewardId) ||
                (r.linkedSessionId && r.linkedSessionId === currentSession.id) ||
                (r.trigger === 'session' && r.linkedId === currentSession.id);
              return isLinked && r.status === 'locked' ? { ...r, status: 'ready' } : r;
            })
          }));
        }

        // Log session
        const newLog = {
          id: uid(),
          sessionId: currentSession?.id || 'custom',
          sessionName: currentSession?.name || 'Focus Session',
          durationMins: phaseMinutes(currentSession, 'focus'),
          date: getTodayStr(),
          timestamp: Date.now(),
          dayOfWeek: new Date().getDay()
        };

        setState(prev => ({
          ...prev,
          sessionLogs: [...prev.sessionLogs, newLog]
        }));
      }

      // Switch to break
      const breakMins = phaseMinutes(currentSession, 'break');
      const breakSecs = breakMins * 60;
      setState(prev => ({
        ...prev,
        activeActivityStartTime: null,
        timer: {
          phase: 'break',
          status: 'idle',
          remaining: breakSecs,
          total: breakSecs,
          sessionsCompletedToday: skipped ? prev.timer.sessionsCompletedToday : prev.timer.sessionsCompletedToday + 1
        }
      }));
    } else {
      // Was break, switch to focus
      if (!skipped) {
        playChime('break');
        announcePhaseEnd('break');
      }

      const focusMins = phaseMinutes(currentSession, 'focus');
      const focusSecs = focusMins * 60;
      setState(prev => ({
        ...prev,
        activeActivityStartTime: null,
        timer: {
          ...prev.timer,
          phase: 'focus',
          status: 'idle',
          remaining: focusSecs,
          total: focusSecs
        }
      }));
    }
  };

  // Rings the bell, then alerts (or falls back to the old toast when alerts are off).
  // On desktop the alert itself comes from Rust's timer, which isn't throttled.
  const announcePhaseEnd = (endedPhase: TimerPhase) => {
    ringBell();
    const n = state.notifications;
    if (!n.phaseAlerts) {
      showToast(endedPhase === 'focus' ? strings.toasts.focusComplete : strings.toasts.breakOver);
      return;
    }
    if (!isTauri()) deliverAlert(buildPhaseAlert(endedPhase, n));
  };

  // Timer Wall-Clock Tick Engine (Drift-free, background-resilient)
  const timerRef = useRef<(() => void) | null>(null);
  // The ticker outlives renders; always call the latest completion handler.
  const handlePhaseCompleteRef = useRef(handlePhaseComplete);
  handlePhaseCompleteRef.current = handlePhaseComplete;

  useEffect(() => {
    if (state.timer.status === 'running') {
      if (!targetEndTimeRef.current) {
        targetEndTimeRef.current = Date.now() + state.timer.remaining * 1000;
        saveTimerRun({
              targetEndTime: targetEndTimeRef.current,
              phase: state.timer.phase,
              sessionId: state.activeSessionId,
              total: state.timer.total
            });
      }

      // Ticks from a worker so a hidden tab/minimized window still ends on time.
      timerRef.current = startTicker(() => {
        const targetEnd = targetEndTimeRef.current;
        if (!targetEnd) return;
        const now = Date.now();
        const remainingSecs = Math.max(0, Math.ceil((targetEnd - now) / 1000));

        if (remainingSecs <= 0) {
          stopTicker();
          targetEndTimeRef.current = null;
          clearTimerRun();
          handlePhaseCompleteRef.current(false);
        } else {
          setState(prev => {
            if (prev.timer.status !== 'running' || prev.timer.remaining === remainingSecs) return prev;
            return {
              ...prev,
              timer: { ...prev.timer, remaining: remainingSecs }
            };
          });
        }
      }, TIMING.timerTickMs);
    } else {
      stopTicker();
    }

    return stopTicker;
    // Restarts only when the run itself changes. remaining/total are read once to set
    // the end time; re-running on every tick would reset the ticker each second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timer.status, state.timer.phase, state.activeSessionId]);

  function stopTicker() {
    timerRef.current?.();
    timerRef.current = null;
  }

  // Desktop: mirror the running phase's end in Rust so the alert fires on time
  // even while WebView2 throttles this window.
  useEffect(() => {
    if (!isTauri()) return;
    const n = state.notifications;
    if (state.timer.status === 'running' && targetEndTimeRef.current && n.phaseAlerts) {
      scheduleDesktopAlert(targetEndTimeRef.current, buildPhaseAlert(state.timer.phase, n)).catch(() => {});
    } else {
      cancelDesktopAlert().catch(() => {});
    }
    // buildPhaseAlert reads only phaseAlerts and autoDismissSec, listed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.timer.status,
    state.timer.phase,
    state.activeSessionId,
    state.notifications.phaseAlerts,
    state.notifications.autoDismissSec
  ]);

  // Re-reads the wall clock; completes the phase if it already elapsed
  const syncTimer = () => {
    if (state.timer.status === 'running' && targetEndTimeRef.current) {
      const now = Date.now();
      const remainingSecs = Math.max(0, Math.ceil((targetEndTimeRef.current - now) / 1000));
      if (remainingSecs <= 0) {
        targetEndTimeRef.current = null;
        clearTimerRun();
        handlePhaseComplete(false);
      } else {
        setState(prev => {
          if (prev.timer.status !== 'running' || prev.timer.remaining === remainingSecs) return prev;
          return {
            ...prev,
            timer: { ...prev.timer, remaining: remainingSecs }
          };
        });
      }
    }
  };

  const getTimerTargetEnd = () => targetEndTimeRef.current;
  const syncTimerRef = useRef(syncTimer);
  syncTimerRef.current = syncTimer;

  // Sync timer immediately on tab visibility / focus change
  useEffect(() => {
    const handleSync = () => syncTimerRef.current();

    document.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('pageshow', handleSync);

    return () => {
      document.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('pageshow', handleSync);
    };
  }, []);

  // Timer Controls
  const toggleTimer = () => {
    setState(prev => {
      const isRunning = prev.timer.status === 'running';
      if (isRunning) {
        const currentRemaining = targetEndTimeRef.current
          ? Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000))
          : prev.timer.remaining;
        targetEndTimeRef.current = null;
        clearTimerRun();
        return {
          ...prev,
          timer: { ...prev.timer, status: 'paused', remaining: currentRemaining }
        };
      }

      const activeSession = prev.sessions.find(s => s.id === prev.activeSessionId) || prev.sessions[0];
      const mins = phaseMinutes(activeSession, prev.timer.phase);
      const expectedTotal = mins * 60;

      let remaining = prev.timer.remaining;
      let total = prev.timer.total;

      if (remaining <= 0 || isNaN(remaining)) {
        remaining = expectedTotal;
        total = expectedTotal;
      }
      if (total <= 0 || isNaN(total)) {
        total = expectedTotal;
      }

      const targetEndTime = Date.now() + remaining * 1000;
      targetEndTimeRef.current = targetEndTime;
      saveTimerRun({
            targetEndTime,
            phase: prev.timer.phase,
            sessionId: prev.activeSessionId,
            total
          });

      return {
        ...prev,
        activeActivityStartTime: !prev.activeActivityStartTime ? Date.now() : prev.activeActivityStartTime,
        timer: {
          ...prev.timer,
          status: 'running',
          remaining,
          total
        }
      };
    });
  };

  const resetTimer = () => {
    stopTicker();
    targetEndTimeRef.current = null;
    clearTimerRun();
    setState(prev => {
      const activeSession = prev.sessions.find(s => s.id === prev.activeSessionId) || prev.sessions[0];
      const mins = phaseMinutes(activeSession, 'focus');
      const total = mins * 60;
      return {
        ...prev,
        activeActivityStartTime: null,
        timer: {
          ...prev.timer,
          phase: 'focus',
          status: 'idle',
          remaining: total,
          total
        }
      };
    });
  };

  const skipPhase = () => {
    stopTicker();
    targetEndTimeRef.current = null;
    clearTimerRun();
    handlePhaseComplete(true);
  };

  const toggleSound = () => setState(prev => ({ ...prev, sound: !prev.sound }));

  const toggleTimerRef = useRef(toggleTimer);
  toggleTimerRef.current = toggleTimer;
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Alerts ──────────────────────────────────────────────────────────
  const dismissAlert = () => setActiveAlert(null);

  /** Starts the timer only if it isn't already running (alert buttons). */
  const startTimerIfIdle = () => {
    syncTimerRef.current();
    // Runs after the sync's state update, so a just-finished phase is idle by now.
    setTimeout(() => {
      if (stateRef.current.timer.status !== 'running') toggleTimerRef.current();
    }, 0);
  };

  const runAlertAction = (action: AlertActionId, payload?: AlertPayload | null) => {
    setActiveAlert(null);
    window.clearTimeout(ringingTimerRef.current);
    setAlertRinging(false);
    if (action === 'start-next') {
      startTimerIfIdle();
    } else if (action === 'start-session' && payload?.sessionId) {
      setActiveTab('timer');
      setActiveSessionRef.current(payload.sessionId);
      setTimeout(() => toggleTimerRef.current(), 0);
    } else if (action === 'open-app' && payload?.kind === 'event-soon') {
      setActiveTab('calendar');
    }
    if (isTauri()) focusMainWindow().catch(() => {});
    else window.focus();
  };
  const runAlertActionRef = useRef(runAlertAction);
  runAlertActionRef.current = runAlertAction;

  // Desktop: Rust fired an alert, and the island window reports button presses.
  useEffect(() => {
    if (!isTauri() || authStatus !== 'authenticated') return;
    const unlisteners: Promise<() => void>[] = [
      listenForAlertFired(({ payload, inFront }) => {
        syncTimerRef.current();
        if (inFront) setActiveAlert(payload);
      }),
      listenForAlertActions((msg: AlertActionMessage) => {
        if (msg.action !== 'dismiss') runAlertActionRef.current(msg.action, msg.payload);
      })
    ];
    return () => unlisteners.forEach(p => p.then(fn => fn()).catch(() => {}));
  }, [authStatus]);

  // Web: buttons on a browser notification come back through the service worker.
  useEffect(() => {
    if (isTauri() || authStatus !== 'authenticated' || !('serviceWorker' in navigator)) return;
    registerAlertWorker();
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string } & Partial<AlertActionMessage>;
      if (data?.type !== SW_ALERT_MESSAGE || !data.action || data.action === 'dismiss') return;
      runAlertActionRef.current(data.action, data.payload ?? null);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [authStatus]);

  // Calendar reminders: a heads-up `leadMinutes` before each scheduled session today.
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const check = () => {
      const n = stateRef.current.notifications;
      if (!n.enabled) return;
      const today = getTodayStr();
      const now = Date.now();
      const due = stateRef.current.calendarEvents.filter(ev => {
        if (ev.date !== today || ev.notified) return false;
        const [h, m] = ev.startTime.split(':').map(Number);
        const start = new Date();
        start.setHours(h || 0, m || 0, 0, 0);
        const diff = start.getTime() - now;
        // Within the lead time, and not more than 2 minutes past the start.
        return diff > -120_000 && diff <= n.leadMinutes * 60_000;
      });
      if (!due.length) return;
      setState(prev => ({
        ...prev,
        calendarEvents: prev.calendarEvents.map(ev => (due.some(d => d.id === ev.id) ? { ...ev, notified: true } : ev))
      }));
      due.forEach(ev => {
        const [h, m] = ev.startTime.split(':').map(Number);
        const start = new Date();
        start.setHours(h || 0, m || 0, 0, 0);
        if (n.sound && stateRef.current.sound) playPhaseChime('focus');
        ringBell();
        deliverAlert(buildEventAlert(ev, Math.round((start.getTime() - now) / 60_000), n));
      });
    };
    check();
    const stop = startTicker(check, TIMING.eventCheckMs);
    return stop;
  }, [authStatus]);

  // ── Onboarding ──────────────────────────────────────────────────────
  const startTour = () => {
    setHelpOpen(false);
    setActiveModal(null);
    setTourActive(true);
  };
  const endTour = () => {
    setTourActive(false);
    setState(prev => (prev.tourSeen ? prev : { ...prev, tourSeen: true }));
  };

  // ── Entity actions (src/context/actions) ──────────────────────────
  const { reorderSessions, setActiveSession, createSession, updateSession, duplicateSession, deleteSession, setSessionTaskLists } = createSessionActions({ setState, showToast, targetEndTimeRef });
  const { reorderTaskLists, reorderTasks, setActiveList, createList, renameList, duplicateList, deleteList, setSelectedListForTimer, addTask, toggleTask, renameTask, duplicateTask, deleteTask } = createListActions({ setState, showToast, stateRef });
  const { moveCalendarEvent, addCalendarEvent, updateCalendarEvent, duplicateCalendarEvent, deleteCalendarEvent, setCalendarView, setCalendarDate } = createCalendarActions({ setState, showToast, stateRef });
  const { addGoal, updateGoal, duplicateGoal, deleteGoal, toggleGoal, addLandmark, updateLandmark, duplicateLandmark, deleteLandmark, toggleLandmark } = createGoalActions({ setState, showToast });
  const { addReward, updateReward, duplicateReward, deleteReward, claimReward } = createRewardActions({ setState, showToast, stateRef, setActiveCelebrationReward });

  const setActiveSessionRef = useRef(setActiveSession);
  setActiveSessionRef.current = setActiveSession;

  const updateNotifications = (settings: Partial<NotificationSettings>) => {
    setState(prev => ({ ...prev, notifications: { ...prev.notifications, ...settings } }));
  };

  const dismissCelebration = () => setActiveCelebrationReward(null);

  return (
    <AppContext.Provider
      value={{
        state,
        activeTab,
        setActiveTab,
        toasts,
        showToast,
        activeCelebrationReward,
        dismissCelebration,
        activeModal,
        openModal,
        closeModal,
        toggleTimer,
        resetTimer,
        skipPhase,
        toggleSound,
        syncTimer,
        getTimerTargetEnd,
        reorderSessions,
        reorderTaskLists,
        reorderTasks,
        moveCalendarEvent,
        setActiveSession,
        createSession,
        updateSession,
        duplicateSession,
        deleteSession,
        setSessionTaskLists,
        setActiveList,
        createList,
        renameList,
        duplicateList,
        deleteList,
        setSelectedListForTimer,
        addTask,
        toggleTask,
        renameTask,
        duplicateTask,
        deleteTask,
        addCalendarEvent,
        updateCalendarEvent,
        duplicateCalendarEvent,
        deleteCalendarEvent,
        setCalendarView,
        setCalendarDate,
        addGoal,
        updateGoal,
        duplicateGoal,
        deleteGoal,
        toggleGoal,
        addLandmark,
        updateLandmark,
        duplicateLandmark,
        deleteLandmark,
        toggleLandmark,
        addReward,
        updateReward,
        duplicateReward,
        deleteReward,
        claimReward,
        updateNotifications,
        authStatus,
        profile,
        token: tokenRef.current,
        login,
        logout,
        setup,
        refreshProfile,
        deleteOwnProfile,
        changePassword,
        updateTheme,
        tourActive,
        startTour,
        endTour,
        helpOpen,
        setHelpOpen,
        alertRinging,
        activeAlert,
        dismissAlert,
        runAlertAction
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
