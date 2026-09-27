import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import {
  AppState,
  TabType,
  Session,
  TaskList,
  Task,
  Goal,
  Landmark,
  Reward,
  CalendarEvent,
  TimerPhase,
  TimerStatus,
  CalendarView,
  NotificationSettings,
  ModalType,
  ModalPayloadMap,
  ActiveModal,
  Profile,
  ThemeMode
} from '../types';
import {
  DEFAULT_SESSIONS,
  DEFAULT_TASK_LISTS,
  DEFAULT_GOALS,
  DEFAULT_REWARDS,
  DEFAULT_CALENDAR_EVENTS
} from '../constants/defaults';
import { api } from '../lib/api';
import { deriveDataKey, encryptBlob, decryptBlob, randomSaltHex, exportRawKey, importRawKey } from '../lib/crypto';
import { strings } from '../constants/strings';
import { getTodayStr } from '../lib/dateUtils';
import { formatDuration } from '../lib/formatUtils';
import { startTicker } from '../lib/ticker';
import {
  AlertActionId,
  AlertActionMessage,
  AlertPayload,
  DEFAULT_AUTO_DISMISS_SEC,
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

interface ToastItem {
  id: string;
  message: string;
  /** Playing its exit animation; removed shortly after. */
  leaving?: boolean;
}

const TOAST_MS = 3500;
const TOAST_EXIT_MS = 180;
const RINGING_MS = 4000;
const EVENT_CHECK_MS = 30_000;

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
  addReward: (reward: Omit<Reward, 'id' | 'status'> & { status?: Reward['status'] }) => string;
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

const LEGACY_STORAGE_KEY = 'focusspace_v1';
const THEME_CACHE_KEY = 'focusspace_theme_cache';
const AUTH_TOKEN_KEY = 'focusspace_auth_token';
const AUTH_KEY_MATERIAL = 'focusspace_auth_key';
const TIMER_RUN_KEY = 'focusspace_timer_run';

interface PersistedTimerRun {
  targetEndTime: number;
  phase: TimerPhase;
  sessionId: string | null;
  total: number;
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Normalizes a raw (possibly partial/legacy) state object into a valid AppState.
function normalizeState(raw: unknown): AppState {
  const r = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : null;
  const sessions: Session[] = Array.isArray(r?.sessions) && r!.sessions.length
    ? (r!.sessions as Session[])
    : DEFAULT_SESSIONS;
  const activeSessionId = typeof r?.activeSessionId === 'string' ? r.activeSessionId : (sessions[0]?.id || 's1');
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const focusMins = activeSession?.focusMinutes || 25;

  const taskLists: TaskList[] = Array.isArray(r?.taskLists) && r!.taskLists.length ? (r!.taskLists as TaskList[]) : DEFAULT_TASK_LISTS;
  const selectedListIdForTimer = (typeof r?.selectedListIdForTimer === 'string' ? r.selectedListIdForTimer : null) || (Array.isArray(r?.taskLists) && (r!.taskLists as TaskList[])[0]?.id) || DEFAULT_TASK_LISTS[0].id;

  // Sessions own their task lists. Legacy data had a single global timer list:
  // the active session inherits it, the others start empty.
  const listIds = new Set(taskLists.map(l => l.id));
  const migratedSessions = sessions.map(s => {
    if (Array.isArray(s.taskListIds)) {
      return { ...s, taskListIds: s.taskListIds.filter(id => listIds.has(id)) };
    }
    const inherit = s.id === activeSessionId && selectedListIdForTimer && listIds.has(selectedListIdForTimer)
      ? [selectedListIdForTimer]
      : [];
    return { ...s, taskListIds: inherit };
  });

  return {
    sessions: migratedSessions,
    activeSessionId,
    taskLists,
    activeListId: (typeof r?.activeListId === 'string' ? r.activeListId : null) || (Array.isArray(r?.taskLists) && (r!.taskLists as TaskList[])[0]?.id) || DEFAULT_TASK_LISTS[0].id,
    selectedListIdForTimer,
    activeActivityStartTime: null,
    taskCompletionLogs: Array.isArray(r?.taskCompletionLogs) ? (r!.taskCompletionLogs as AppState['taskCompletionLogs']) : [],
    sessionLogs: Array.isArray(r?.sessionLogs) ? (r!.sessionLogs as AppState['sessionLogs']) : [],
    calendarEvents: Array.isArray(r?.calendarEvents) ? (r!.calendarEvents as CalendarEvent[]) : DEFAULT_CALENDAR_EVENTS,
    calendarDate: typeof r?.calendarDate === 'string' ? r.calendarDate : getTodayStr(),
    calendarView: (r?.calendarView === 'week' || r?.calendarView === 'day' || r?.calendarView === 'month') ? r.calendarView : 'week',
    notifications: normalizeNotifications(r?.notifications),
    goals: Array.isArray(r?.goals) && r!.goals.length ? (r!.goals as Goal[]) : DEFAULT_GOALS,
    rewards: Array.isArray(r?.rewards) && r!.rewards.length ? (r!.rewards as Reward[]) : DEFAULT_REWARDS,
    timer: {
      phase: 'focus',
      status: 'idle',
      remaining: focusMins * 60,
      total: focusMins * 60,
      sessionsCompletedToday: typeof (r?.timer as Record<string, unknown> | undefined)?.sessionsCompletedToday === 'number'
        ? ((r!.timer as Record<string, unknown>).sessionsCompletedToday as number)
        : 0
    },
    sound: typeof r?.sound === 'boolean' ? r.sound : true,
    theme: (r?.theme === 'light' || r?.theme === 'dark' || r?.theme === 'system') ? r.theme : 'system',
    // Missing on data saved before the tour existed, so every profile sees it once.
    tourSeen: r?.tourSeen === true
  };
}

function normalizeNotifications(raw: unknown): NotificationSettings {
  const n = (raw && typeof raw === 'object') ? (raw as Partial<NotificationSettings>) : {};
  return {
    enabled: typeof n.enabled === 'boolean' ? n.enabled : true,
    leadMinutes: typeof n.leadMinutes === 'number' && n.leadMinutes > 0 ? n.leadMinutes : 10,
    sound: typeof n.sound === 'boolean' ? n.sound : true,
    phaseAlerts: typeof n.phaseAlerts === 'boolean' ? n.phaseAlerts : true,
    autoDismissSec: typeof n.autoDismissSec === 'number' && n.autoDismissSec > 0 ? n.autoDismissSec : DEFAULT_AUTO_DISMISS_SEC
  };
}

/** True when the user asked the OS for less motion. */
function prefersReducedMotion(): boolean {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeMode(mode: ThemeMode) {
  const resolved = resolveThemeMode(mode);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
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
        const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        const storedKeyMaterial = localStorage.getItem(AUTH_KEY_MATERIAL);

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
        try {
          const timerRunRaw = localStorage.getItem(TIMER_RUN_KEY);
          if (timerRunRaw) {
            const runInfo: PersistedTimerRun = JSON.parse(timerRunRaw);
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
              localStorage.removeItem(TIMER_RUN_KEY);
            }
          }
        } catch {}

        if (!cancelled) {
          setProfile(meRes.profile);
          setState(nextState);
          setAuthStatus('authenticated');
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_KEY_MATERIAL);
          localStorage.removeItem(TIMER_RUN_KEY);
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
    try {
      const cached = localStorage.getItem(THEME_CACHE_KEY) as ThemeMode | null;
      if (cached === 'light' || cached === 'dark' || cached === 'system') applyThemeMode(cached);
    } catch {}
  }, []);

  useEffect(() => {
    applyThemeMode(state.theme);
    try {
      localStorage.setItem(THEME_CACHE_KEY, state.theme);
    } catch {}
  }, [state.theme]);

  useEffect(() => {
    if (state.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeMode('system');
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
        const copy = { ...state, timer: { ...state.timer, status: 'idle' } };
        const sealed = await encryptBlob(JSON.stringify(copy), key);
        await api.put('/api/data', sealed, token);
      } catch (err) {
        console.warn('Failed to persist data:', err);
      }
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, authStatus]);

  const showToast = (message: string) => {
    const id = uid();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TOAST_EXIT_MS);
    }, TOAST_MS);
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
    localStorage.setItem(AUTH_TOKEN_KEY, res.token);
    localStorage.setItem(AUTH_KEY_MATERIAL, rawKeyB64);
    setProfile(res.profile);
    setAuthStatus('authenticated');
    setState(next);
  };

  const setup = async (username: string, displayName: string, password: string) => {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    const res = await api.post<AuthResponse>('/api/auth/setup', { username, displayName, password });
    tokenRef.current = res.token;
    const key = await deriveDataKey(password, res.data.salt);
    dataKeyRef.current = key;
    const rawKeyB64 = await exportRawKey(key);
    localStorage.setItem(AUTH_TOKEN_KEY, res.token);
    localStorage.setItem(AUTH_KEY_MATERIAL, rawKeyB64);

    let next = normalizeState(null);
    let migrated = false;
    if (legacyRaw) {
      try {
        next = normalizeState(JSON.parse(legacyRaw));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
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
        const copy = { ...state, timer: { ...state.timer, status: 'idle' } };
        const sealed = await encryptBlob(JSON.stringify(copy), key);
        await api.put('/api/data', sealed, token);
      } catch {}
    }
    if (token) {
      try {
        await api.post('/api/auth/logout', {}, token);
      } catch {}
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY_MATERIAL);
    localStorage.removeItem(TIMER_RUN_KEY);
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
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY_MATERIAL);
    localStorage.removeItem(TIMER_RUN_KEY);
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
      throw new Error('Not authenticated');
    }
    // Flush any pending save so stale ciphertext (old key) can't overwrite the re-encrypted blob
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    // Re-encrypt the whole blob under a fresh salt + new password-derived key
    const newSalt = randomSaltHex();
    const newKey = await deriveDataKey(newPassword, newSalt);
    const copy = { ...state, timer: { ...state.timer, status: 'idle' } };
    const sealed = await encryptBlob(JSON.stringify(copy), newKey);
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
    localStorage.setItem(AUTH_TOKEN_KEY, res.token);
    localStorage.setItem(AUTH_KEY_MATERIAL, rawKeyB64);
    setProfile(res.profile);
    showToast(strings.profile.passwordChangedMsg);
  };

  const refreshProfile = (updated: Profile) => setProfile(updated);

  const updateTheme = (theme: ThemeMode) => {
    setState(prev => ({ ...prev, theme }));
  };

  // Web Audio Chime Sound
  const playChime = (type: TimerPhase = 'focus') => {
    if (!state.sound) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const freqs = type === 'focus' ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.18 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.5);
        osc.start(ctx.currentTime + i * 0.18);
        osc.stop(ctx.currentTime + i * 0.18 + 0.55);
      });
    } catch (e) {}
  };

  const ringBell = () => {
    window.clearTimeout(ringingTimerRef.current);
    setAlertRinging(true);
    ringingTimerRef.current = window.setTimeout(() => setAlertRinging(false), RINGING_MS);
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
    try {
      localStorage.removeItem(TIMER_RUN_KEY);
    } catch {}
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
          durationMins: currentSession?.focusMinutes || 25,
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
      const breakMins = currentSession?.breakMinutes || 5;
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

      const focusMins = currentSession?.focusMinutes || 25;
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
        try {
          localStorage.setItem(
            TIMER_RUN_KEY,
            JSON.stringify({
              targetEndTime: targetEndTimeRef.current,
              phase: state.timer.phase,
              sessionId: state.activeSessionId,
              total: state.timer.total
            })
          );
        } catch {}
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
          try {
            localStorage.removeItem(TIMER_RUN_KEY);
          } catch {}
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
      }, 500);
    } else {
      stopTicker();
    }

    return stopTicker;
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
        try {
          localStorage.removeItem(TIMER_RUN_KEY);
        } catch {}
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
    const handleSync = () => syncTimer();

    document.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('pageshow', handleSync);

    return () => {
      document.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('pageshow', handleSync);
    };
  }, [state.timer.status]);

  // Timer Controls
  const toggleTimer = () => {
    setState(prev => {
      const isRunning = prev.timer.status === 'running';
      if (isRunning) {
        const currentRemaining = targetEndTimeRef.current
          ? Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000))
          : prev.timer.remaining;
        targetEndTimeRef.current = null;
        try {
          localStorage.removeItem(TIMER_RUN_KEY);
        } catch {}
        return {
          ...prev,
          timer: { ...prev.timer, status: 'paused', remaining: currentRemaining }
        };
      }

      const activeSession = prev.sessions.find(s => s.id === prev.activeSessionId) || prev.sessions[0];
      const mins = prev.timer.phase === 'focus' ? (activeSession?.focusMinutes || 25) : (activeSession?.breakMinutes || 5);
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
      try {
        localStorage.setItem(
          TIMER_RUN_KEY,
          JSON.stringify({
            targetEndTime,
            phase: prev.timer.phase,
            sessionId: prev.activeSessionId,
            total
          })
        );
      } catch {}

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
    try {
      localStorage.removeItem(TIMER_RUN_KEY);
    } catch {}
    setState(prev => {
      const activeSession = prev.sessions.find(s => s.id === prev.activeSessionId) || prev.sessions[0];
      const mins = activeSession?.focusMinutes || 25;
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
    try {
      localStorage.removeItem(TIMER_RUN_KEY);
    } catch {}
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
        if (n.sound) playChime('focus');
        ringBell();
        deliverAlert(buildEventAlert(ev, Math.round((start.getTime() - now) / 60_000), n));
      });
    };
    check();
    const stop = startTicker(check, EVENT_CHECK_MS);
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

  // ══════════════════════════════════════════════════════════════════════
  // DRAG & DROP REORDERING
  // ══════════════════════════════════════════════════════════════════════
  const reorderSessions = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setState(prev => {
      const fromIdx = prev.sessions.findIndex(s => s.id === sourceId);
      const toIdx = prev.sessions.findIndex(s => s.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const updated = [...prev.sessions];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return { ...prev, sessions: updated };
    });
  };

  const reorderTaskLists = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setState(prev => {
      const fromIdx = prev.taskLists.findIndex(l => l.id === sourceId);
      const toIdx = prev.taskLists.findIndex(l => l.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const updated = [...prev.taskLists];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return { ...prev, taskLists: updated };
    });
  };

  const reorderTasks = (listId: string, sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setState(prev => {
      const targetList = prev.taskLists.find(l => l.id === listId);
      if (!targetList) return prev;
      const fromIdx = targetList.tasks.findIndex(t => t.id === sourceId);
      const toIdx = targetList.tasks.findIndex(t => t.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const newTasks = [...targetList.tasks];
      const [moved] = newTasks.splice(fromIdx, 1);
      newTasks.splice(toIdx, 0, moved);

      return {
        ...prev,
        taskLists: prev.taskLists.map(l => (l.id === listId ? { ...l, tasks: newTasks } : l))
      };
    });
  };

  const moveCalendarEvent = (eventId: string, targetDate: string, targetTime: string) => {
    setState(prev => {
      const ev = prev.calendarEvents.find(e => e.id === eventId);
      if (!ev) return prev;
      showToast(strings.toasts.eventMoved.replace('{date}', targetDate).replace('{time}', targetTime));
      return {
        ...prev,
        calendarEvents: prev.calendarEvents.map(e =>
          e.id === eventId ? { ...e, date: targetDate, startTime: targetTime } : e
        )
      };
    });
  };

  // ══════════════════════════════════════════════════════════════════════
  // SESSIONS
  // ══════════════════════════════════════════════════════════════════════
  const setActiveSession = (id: string) => {
    if (isTauri()) cancelDesktopAlert().catch(() => {});
    targetEndTimeRef.current = null;
    try {
      localStorage.removeItem(TIMER_RUN_KEY);
    } catch {}
    setState(prev => {
      const s = prev.sessions.find(x => x.id === id) || prev.sessions[0];
      const dur = (s?.focusMinutes || 25) * 60;
      return {
        ...prev,
        activeSessionId: id,
        selectedListIdForTimer: s?.taskListIds?.[0] ?? prev.selectedListIdForTimer,
        activeActivityStartTime: null,
        timer: { ...prev.timer, phase: 'focus', status: 'idle', remaining: dur, total: dur }
      };
    });
  };

  const createSession = (session: Omit<Session, 'id'>): string => {
    const newSession: Session = { ...session, taskListIds: session.taskListIds ? [...session.taskListIds] : [], id: uid() };
    setState(prev => {
      const updatedRewards = newSession.rewardId
        ? prev.rewards.map(r =>
            r.id === newSession.rewardId
              ? { ...r, linkedSessionId: newSession.id, linkedId: newSession.id, trigger: 'session' as const }
              : r
          )
        : prev.rewards;

      return {
        ...prev,
        sessions: [...prev.sessions, newSession],
        rewards: updatedRewards,
        activeSessionId: prev.activeSessionId || newSession.id
      };
    });
    showToast(strings.toasts.sessionCreated.replace('{name}', newSession.name));
    return newSession.id;
  };

  const updateSession = (id: string, session: Partial<Session>) => {
    setState(prev => {
      const updated = prev.sessions.map(s => (s.id === id ? { ...s, ...session } : s));
      const activeS = updated.find(s => s.id === prev.activeSessionId) || updated[0];
      let timerUpdate = prev.timer;
      if (prev.activeSessionId === id && prev.timer.status === 'idle') {
        const mins = prev.timer.phase === 'focus' ? (activeS?.focusMinutes || 25) : (activeS?.breakMinutes || 5);
        timerUpdate = { ...prev.timer, remaining: mins * 60, total: mins * 60 };
      }

      let updatedRewards = prev.rewards;
      if (session.rewardId !== undefined) {
        updatedRewards = prev.rewards.map(r => {
          // Unlink previously linked reward if it changed
          if ((r.linkedSessionId === id || (r.trigger === 'session' && r.linkedId === id)) && r.id !== session.rewardId) {
            return {
              ...r,
              linkedSessionId: null,
              linkedId: r.linkedGoalId || null,
              trigger: r.linkedGoalId ? ('goal' as const) : ('manual' as const)
            };
          }
          // Link new reward
          if (session.rewardId && r.id === session.rewardId) {
            return {
              ...r,
              linkedSessionId: id,
              linkedId: id,
              trigger: 'session' as const
            };
          }
          return r;
        });
      }

      return { ...prev, sessions: updated, rewards: updatedRewards, timer: timerUpdate };
    });
    showToast(strings.toasts.sessionUpdated);
  };

  const duplicateSession = (id: string) => {
    setState(prev => {
      const target = prev.sessions.find(s => s.id === id);
      if (!target) return prev;
      const dup: Session = {
        ...target,
        id: uid(),
        name: `${target.name} (Copy)`,
        taskListIds: [...(target.taskListIds || [])]
      };
      return { ...prev, sessions: [...prev.sessions, dup] };
    });
    showToast(strings.toasts.sessionDuplicated);
  };

  const deleteSession = (id: string) => {
    setState(prev => {
      const filtered = prev.sessions.filter(s => s.id !== id);
      const nextActiveId = prev.activeSessionId === id ? (filtered[0]?.id || null) : prev.activeSessionId;
      const nextActive = filtered.find(s => s.id === nextActiveId) || filtered[0];
      const mins = nextActive ? nextActive.focusMinutes : 25;

      const updatedRewards = prev.rewards.map(r => {
        if (r.linkedSessionId === id || (r.trigger === 'session' && r.linkedId === id)) {
          return {
            ...r,
            linkedSessionId: null,
            linkedId: r.linkedGoalId || null,
            trigger: r.linkedGoalId ? ('goal' as const) : ('manual' as const)
          };
        }
        return r;
      });

      return {
        ...prev,
        sessions: filtered,
        rewards: updatedRewards,
        activeSessionId: nextActiveId,
        timer: {
          ...prev.timer,
          status: 'idle',
          phase: 'focus',
          remaining: mins * 60,
          total: mins * 60
        }
      };
    });
    showToast(strings.toasts.sessionDeleted);
  };

  // Silent on purpose: called from inline pickers, where a toast per change is noise.
  const setSessionTaskLists = (sessionId: string, listIds: string[]) => {
    const unique = Array.from(new Set(listIds));
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => (s.id === sessionId ? { ...s, taskListIds: unique } : s)),
      selectedListIdForTimer: prev.activeSessionId === sessionId ? (unique[0] || null) : prev.selectedListIdForTimer
    }));
  };

  // ══════════════════════════════════════════════════════════════════════
  // LISTS
  // ══════════════════════════════════════════════════════════════════════
  const setActiveList = (id: string) => setState(prev => ({ ...prev, activeListId: id }));

  const createList = (name: string, options: { activate?: boolean } = {}): string => {
    const { activate = true } = options;
    const newList: TaskList = { id: uid(), name, tasks: [] };
    setState(prev => ({
      ...prev,
      taskLists: [...prev.taskLists, newList],
      activeListId: activate ? newList.id : prev.activeListId,
      selectedListIdForTimer: prev.selectedListIdForTimer || newList.id
    }));
    showToast(strings.toasts.listCreated.replace('{name}', name));
    return newList.id;
  };

  const renameList = (id: string, name: string) => {
    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(l => (l.id === id ? { ...l, name } : l))
    }));
    showToast(strings.toasts.listRenamed);
  };

  const duplicateList = (id: string) => {
    setState(prev => {
      const target = prev.taskLists.find(l => l.id === id);
      if (!target) return prev;
      const dup: TaskList = {
        id: uid(),
        name: `${target.name} (Copy)`,
        tasks: target.tasks.map(t => ({ ...t, id: uid(), completed: false, durationSeconds: null }))
      };
      return { ...prev, taskLists: [...prev.taskLists, dup], activeListId: dup.id };
    });
    showToast(strings.toasts.listDuplicated);
  };

  const deleteList = (id: string) => {
    setState(prev => {
      const filtered = prev.taskLists.filter(l => l.id !== id);
      return {
        ...prev,
        taskLists: filtered,
        sessions: prev.sessions.map(s =>
          s.taskListIds?.includes(id) ? { ...s, taskListIds: s.taskListIds.filter(x => x !== id) } : s
        ),
        activeListId: filtered[0]?.id || null,
        selectedListIdForTimer:
          prev.selectedListIdForTimer === id ? (filtered[0]?.id || null) : prev.selectedListIdForTimer
      };
    });
    showToast(strings.toasts.listDeleted);
  };

  const setSelectedListForTimer = (id: string | null) => setState(prev => ({ ...prev, selectedListIdForTimer: id }));

  // ══════════════════════════════════════════════════════════════════════
  // TASKS
  // ══════════════════════════════════════════════════════════════════════
  const addTask = (listId: string, text: string) => {
    const newTask: Task = { id: uid(), text, completed: false, created: Date.now(), createdAt: Date.now() };
    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(l => (l.id === listId ? { ...l, tasks: [...l.tasks, newTask] } : l))
    }));
  };

  const toggleTask = (listId: string, taskId: string, checked: boolean) => {
    const now = Date.now();
    let durationSeconds: number | null = null;
    let completedTaskText = '';

    setState(prev => {
      const updatedLists = prev.taskLists.map(l => {
        if (l.id !== listId) return l;
        return {
          ...l,
          tasks: l.tasks.map(t => {
            if (t.id !== taskId) return t;
            if (checked) {
              const startTime = prev.activeActivityStartTime || now - 60000;
              durationSeconds = Math.max(1, Math.round((now - startTime) / 1000));
              completedTaskText = t.text;
              return { ...t, completed: true, completedAt: now, durationSeconds };
            }
            return { ...t, completed: false, completedAt: null, durationSeconds: null };
          })
        };
      });

      const updatedLogs = [...prev.taskCompletionLogs];
      if (checked && durationSeconds) {
        const listName = prev.taskLists.find(l => l.id === listId)?.name || 'Task List';
        updatedLogs.push({
          id: uid(),
          taskId,
          taskText: completedTaskText,
          durationSeconds,
          listId,
          listName,
          timestamp: now,
          date: getTodayStr()
        });
        showToast(strings.toasts.taskDone.replace('{duration}', formatDuration(durationSeconds)));
      }

      return {
        ...prev,
        taskLists: updatedLists,
        taskCompletionLogs: updatedLogs,
        activeActivityStartTime: checked ? now : prev.activeActivityStartTime
      };
    });
  };

  const renameTask = (listId: string, taskId: string, newText: string) => {
    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(l =>
        l.id === listId
          ? {
              ...l,
              tasks: l.tasks.map(t => (t.id === taskId ? { ...t, text: newText } : t))
            }
          : l
      )
    }));
    showToast(strings.toasts.taskUpdated);
  };

  const duplicateTask = (listId: string, taskId: string) => {
    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(l => {
        if (l.id !== listId) return l;
        const target = l.tasks.find(t => t.id === taskId);
        if (!target) return l;
        const copy: Task = { ...target, id: uid(), completed: false, durationSeconds: null };
        const idx = l.tasks.indexOf(target);
        const newTasks = [...l.tasks];
        newTasks.splice(idx + 1, 0, copy);
        return { ...l, tasks: newTasks };
      })
    }));
  };

  const deleteTask = (listId: string, taskId: string) => {
    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(l =>
        l.id === listId
          ? {
              ...l,
              tasks: l.tasks.filter(t => t.id !== taskId)
            }
          : l
      )
    }));
  };

  // ══════════════════════════════════════════════════════════════════════
  // CALENDAR
  // ══════════════════════════════════════════════════════════════════════
  const addCalendarEvent = (event: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = { ...event, id: uid() };
    setState(prev => ({ ...prev, calendarEvents: [...prev.calendarEvents, newEvent] }));
    showToast(strings.toasts.eventScheduled.replace('{title}', newEvent.title));
  };

  const updateCalendarEvent = (id: string, event: Partial<CalendarEvent>) => {
    setState(prev => ({
      ...prev,
      calendarEvents: prev.calendarEvents.map(e => (e.id === id ? { ...e, ...event } : e))
    }));
    showToast(strings.toasts.eventUpdated);
  };

  const duplicateCalendarEvent = (id: string) => {
    setState(prev => {
      const target = prev.calendarEvents.find(e => e.id === id);
      if (!target) return prev;
      const dup: CalendarEvent = { ...target, id: uid(), title: `${target.title} (Copy)` };
      return { ...prev, calendarEvents: [...prev.calendarEvents, dup] };
    });
    showToast(strings.toasts.eventDuplicated);
  };

  const deleteCalendarEvent = (id: string) => {
    setState(prev => ({ ...prev, calendarEvents: prev.calendarEvents.filter(e => e.id !== id) }));
    showToast(strings.toasts.eventRemoved);
  };

  const setCalendarView = (view: CalendarView) => setState(prev => ({ ...prev, calendarView: view }));

  const setCalendarDate = (date: string) => setState(prev => ({ ...prev, calendarDate: date }));

  // ══════════════════════════════════════════════════════════════════════
  // GOALS & LANDMARKS
  // ══════════════════════════════════════════════════════════════════════
  const addGoal = (goal: Omit<Goal, 'id' | 'completed'>) => {
    const newGoal: Goal = {
      ...goal,
      id: uid(),
      name: goal.name || goal.title || 'Untitled Goal',
      title: goal.name || goal.title || 'Untitled Goal',
      type: goal.type || goal.frequency || 'daily',
      frequency: goal.type || goal.frequency || 'daily',
      target: goal.target || 4,
      current: 0,
      completed: false,
      landmarks: goal.landmarks || []
    };
    setState(prev => {
      const updatedRewards = newGoal.rewardId
        ? prev.rewards.map(r =>
            r.id === newGoal.rewardId
              ? { ...r, linkedGoalId: newGoal.id, linkedId: newGoal.id, trigger: 'goal' as const }
              : r
          )
        : prev.rewards;

      return {
        ...prev,
        goals: [...prev.goals, newGoal],
        rewards: updatedRewards
      };
    });
    showToast(strings.toasts.goalCreated.replace('{name}', newGoal.name));
  };

  const updateGoal = (id: string, goal: Partial<Goal>) => {
    setState(prev => {
      const updated = prev.goals.map(g =>
        g.id === id
          ? {
              ...g,
              ...goal,
              name: goal.name || goal.title || g.name,
              title: goal.title || goal.name || g.title,
              type: goal.type || goal.frequency || g.type,
              frequency: goal.frequency || goal.type || g.frequency
            }
          : g
      );

      let updatedRewards = prev.rewards;
      if (goal.rewardId !== undefined) {
        updatedRewards = prev.rewards.map(r => {
          if ((r.linkedGoalId === id || (r.trigger === 'goal' && r.linkedId === id)) && r.id !== goal.rewardId) {
            return {
              ...r,
              linkedGoalId: null,
              linkedId: r.linkedSessionId || null,
              trigger: r.linkedSessionId ? ('session' as const) : ('manual' as const)
            };
          }
          if (goal.rewardId && r.id === goal.rewardId) {
            return {
              ...r,
              linkedGoalId: id,
              linkedId: id,
              trigger: 'goal' as const
            };
          }
          return r;
        });
      }

      return { ...prev, goals: updated, rewards: updatedRewards };
    });
    showToast(strings.toasts.goalUpdated);
  };

  const duplicateGoal = (id: string) => {
    setState(prev => {
      const target = prev.goals.find(g => g.id === id);
      if (!target) return prev;
      const dup: Goal = {
        ...target,
        id: uid(),
        name: `${target.name} (Copy)`,
        title: `${target.name} (Copy)`,
        landmarks: (target.landmarks || []).map(l => ({ ...l, id: uid(), completed: false }))
      };
      return { ...prev, goals: [...prev.goals, dup] };
    });
    showToast(strings.toasts.goalDuplicated);
  };

  const deleteGoal = (id: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== id),
      rewards: prev.rewards.map(r => {
        if (r.linkedGoalId === id || (r.trigger === 'goal' && r.linkedId === id)) {
          return {
            ...r,
            linkedGoalId: null,
            linkedId: r.linkedSessionId || null,
            trigger: r.linkedSessionId ? ('session' as const) : ('manual' as const)
          };
        }
        return r;
      })
    }));
    showToast(strings.toasts.goalDeleted);
  };

  const toggleGoal = (id: string) => {
    setState(prev => {
      const updated = prev.goals.map(g => {
        if (g.id !== id) return g;
        const nextCompleted = !g.completed;
        return {
          ...g,
          completed: nextCompleted,
          current: nextCompleted ? (g.target || 1) : 0
        };
      });

      // Check for goal completion rewards
      const targetGoal = updated.find(g => g.id === id);
      let updatedRewards = prev.rewards;
      if (targetGoal && targetGoal.completed) {
        updatedRewards = prev.rewards.map(r => {
          const isLinked =
            (r.linkedGoalId && r.linkedGoalId === id) ||
            (r.trigger === 'goal' && r.linkedId === id) ||
            (targetGoal.rewardId && r.id === targetGoal.rewardId);
          return isLinked && r.status === 'locked' ? { ...r, status: 'ready' } : r;
        });
      }

      return {
        ...prev,
        goals: updated,
        rewards: updatedRewards
      };
    });
  };

  const addLandmark = (goalId: string, landmark: Omit<Landmark, 'id'>) => {
    const newLm: Landmark = {
      ...landmark,
      id: uid(),
      name: landmark.name || landmark.text || 'Untitled Landmark',
      text: landmark.name || landmark.text || 'Untitled Landmark',
      completed: false
    };
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g =>
        g.id === goalId ? { ...g, landmarks: [...(g.landmarks || []), newLm] } : g
      )
    }));
  };

  const updateLandmark = (goalId: string, landmarkId: string, landmark: Partial<Landmark>) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => {
        if (g.id !== goalId || !g.landmarks) return g;
        return {
          ...g,
          landmarks: g.landmarks.map(l =>
            l.id === landmarkId
              ? {
                  ...l,
                  ...landmark,
                  name: landmark.name || landmark.text || l.name,
                  text: landmark.text || landmark.name || l.text
                }
              : l
          )
        };
      })
    }));
  };

  const duplicateLandmark = (goalId: string, landmarkId: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => {
        if (g.id !== goalId || !g.landmarks) return g;
        const target = g.landmarks.find(l => l.id === landmarkId);
        if (!target) return g;
        const copy: Landmark = { ...target, id: uid(), completed: false };
        const idx = g.landmarks.indexOf(target);
        const newLms = [...g.landmarks];
        newLms.splice(idx + 1, 0, copy);
        return { ...g, landmarks: newLms };
      })
    }));
  };

  const deleteLandmark = (goalId: string, landmarkId: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => {
        if (g.id !== goalId || !g.landmarks) return g;
        return { ...g, landmarks: g.landmarks.filter(l => l.id !== landmarkId) };
      })
    }));
  };

  const toggleLandmark = (goalId: string, landmarkId: string) => {
    setState(prev => {
      let landmarkCompleted = false;
      let landmarkRewardId: string | null | undefined = null;

      const updatedGoals = prev.goals.map(g => {
        if (g.id !== goalId || !g.landmarks) return g;
        const updatedLm = g.landmarks.map(lm => {
          if (lm.id === landmarkId) {
            const comp = !lm.completed;
            landmarkCompleted = comp;
            landmarkRewardId = lm.rewardId;
            return { ...lm, completed: comp };
          }
          return lm;
        });
        const compCount = updatedLm.filter(lm => lm.completed).length;
        const allCompleted = updatedLm.length > 0 && compCount === updatedLm.length;
        return {
          ...g,
          landmarks: updatedLm,
          current: compCount,
          completed: allCompleted
        };
      });

      // Unlock landmark and goal rewards if newly completed
      let updatedRewards = prev.rewards;
      if (landmarkCompleted) {
        updatedRewards = prev.rewards.map(r => {
          if (
            (r.trigger === 'landmark' && r.linkedId === landmarkId && r.status === 'locked') ||
            (landmarkRewardId && r.id === landmarkRewardId && r.status === 'locked')
          ) {
            return { ...r, status: 'ready' };
          }
          return r;
        });

        const targetGoal = updatedGoals.find(g => g.id === goalId);
        if (targetGoal && targetGoal.completed) {
          updatedRewards = updatedRewards.map(r => {
            if (
              (r.trigger === 'goal' && r.linkedId === goalId && r.status === 'locked') ||
              (targetGoal.rewardId && r.id === targetGoal.rewardId && r.status === 'locked')
            ) {
              return { ...r, status: 'ready' };
            }
            return r;
          });
        }
      }

      return {
        ...prev,
        goals: updatedGoals,
        rewards: updatedRewards
      };
    });
  };

  // ══════════════════════════════════════════════════════════════════════
  // REWARDS
  // ══════════════════════════════════════════════════════════════════════
  const addReward = (reward: Omit<Reward, 'id' | 'status'> & { status?: Reward['status'] }): string => {
    const linkedSession = reward.linkedSessionId || (reward.trigger === 'session' ? reward.linkedId : null);
    const linkedGoal = reward.linkedGoalId || (reward.trigger === 'goal' ? reward.linkedId : null);
    const inferredTrigger: Reward['trigger'] = reward.trigger || (linkedSession ? 'session' : linkedGoal ? 'goal' : 'manual');

    const newReward: Reward = {
      ...reward,
      id: uid(),
      name: reward.name,
      description: reward.description || reward.desc || '',
      desc: reward.description || reward.desc || '',
      emoji: reward.emoji || reward.icon || '🎁',
      icon: reward.emoji || reward.icon || '🎁',
      trigger: inferredTrigger,
      linkedSessionId: linkedSession,
      linkedGoalId: linkedGoal,
      linkedId: linkedSession || linkedGoal || reward.linkedId || null,
      status: reward.status || (inferredTrigger === 'manual' && !linkedSession && !linkedGoal ? 'ready' : 'locked'),
      claimedAt: null
    };

    setState(prev => {
      const updatedSessions = newReward.linkedSessionId
        ? prev.sessions.map(s => (s.id === newReward.linkedSessionId ? { ...s, rewardId: newReward.id } : s))
        : prev.sessions;

      const updatedGoals = newReward.linkedGoalId
        ? prev.goals.map(g => (g.id === newReward.linkedGoalId ? { ...g, rewardId: newReward.id } : g))
        : prev.goals;

      return {
        ...prev,
        rewards: [...prev.rewards, newReward],
        sessions: updatedSessions,
        goals: updatedGoals
      };
    });
    showToast(strings.toasts.rewardCreated.replace('{name}', newReward.name));
    return newReward.id;
  };

  const updateReward = (id: string, reward: Partial<Reward>) => {
    setState(prev => {
      const updatedRewards = prev.rewards.map(r => {
        if (r.id !== id) return r;
        const nextLinkedSession = reward.linkedSessionId !== undefined
          ? reward.linkedSessionId
          : (reward.linkedId && reward.trigger === 'session' ? reward.linkedId : r.linkedSessionId);
        const nextLinkedGoal = reward.linkedGoalId !== undefined
          ? reward.linkedGoalId
          : (reward.linkedId && reward.trigger === 'goal' ? reward.linkedId : r.linkedGoalId);

        let nextTrigger = reward.trigger || r.trigger;
        if (reward.linkedSessionId !== undefined || reward.linkedGoalId !== undefined) {
          if (nextLinkedSession) nextTrigger = 'session';
          else if (nextLinkedGoal) nextTrigger = 'goal';
          else if (!r.linkedId) nextTrigger = 'manual';
        }

        return {
          ...r,
          ...reward,
          description: reward.description !== undefined ? reward.description : (reward.desc !== undefined ? reward.desc : r.description),
          desc: reward.desc !== undefined ? reward.desc : (reward.description !== undefined ? reward.description : r.desc),
          emoji: reward.emoji || reward.icon || r.emoji,
          icon: reward.icon || reward.emoji || r.icon,
          trigger: nextTrigger,
          linkedSessionId: nextLinkedSession,
          linkedGoalId: nextLinkedGoal,
          linkedId: nextLinkedSession || nextLinkedGoal || (reward.linkedId !== undefined ? reward.linkedId : r.linkedId)
        };
      });

      const target = updatedRewards.find(r => r.id === id);
      const targetSessionId = target?.linkedSessionId || (target?.trigger === 'session' ? target?.linkedId : null);
      const targetGoalId = target?.linkedGoalId || (target?.trigger === 'goal' ? target?.linkedId : null);

      let updatedSessions = prev.sessions;
      if (reward.linkedSessionId !== undefined || reward.linkedId !== undefined) {
        updatedSessions = prev.sessions.map(s => {
          if (s.rewardId === id && s.id !== targetSessionId) {
            return { ...s, rewardId: null };
          }
          if (targetSessionId && s.id === targetSessionId) {
            return { ...s, rewardId: id };
          }
          return s;
        });
      }

      let updatedGoals = prev.goals;
      if (reward.linkedGoalId !== undefined || reward.linkedId !== undefined) {
        updatedGoals = prev.goals.map(g => {
          if (g.rewardId === id && g.id !== targetGoalId) {
            return { ...g, rewardId: null };
          }
          if (targetGoalId && g.id === targetGoalId) {
            return { ...g, rewardId: id };
          }
          return g;
        });
      }

      return {
        ...prev,
        rewards: updatedRewards,
        sessions: updatedSessions,
        goals: updatedGoals
      };
    });
    showToast(strings.toasts.rewardUpdated);
  };

  const duplicateReward = (id: string) => {
    setState(prev => {
      const target = prev.rewards.find(r => r.id === id);
      if (!target) return prev;
      const dup: Reward = {
        ...target,
        id: uid(),
        name: `${target.name} (Copy)`,
        status: target.trigger === 'manual' ? 'ready' : 'locked',
        claimedAt: null
      };
      return { ...prev, rewards: [...prev.rewards, dup] };
    });
    showToast(strings.toasts.rewardDuplicated);
  };

  const deleteReward = (id: string) => {
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.filter(r => r.id !== id),
      sessions: prev.sessions.map(s => (s.rewardId === id ? { ...s, rewardId: null } : s)),
      goals: prev.goals.map(g => ({
        ...g,
        rewardId: g.rewardId === id ? null : g.rewardId,
        landmarks: (g.landmarks || []).map(l => (l.rewardId === id ? { ...l, rewardId: null } : l))
      }))
    }));
    showToast(strings.toasts.rewardDeleted);
  };

  const claimReward = (id: string) => {
    setState(prev => {
      const target = prev.rewards.find(r => r.id === id);
      if (target && target.status === 'ready') {
        setActiveCelebrationReward(target);
        return {
          ...prev,
          rewards: prev.rewards.map(r => (r.id === id ? { ...r, status: 'claimed', claimedAt: Date.now() } : r))
        };
      }
      return prev;
    });
  };

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
