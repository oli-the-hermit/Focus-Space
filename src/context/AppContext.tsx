import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
import { deriveDataKey, encryptBlob, decryptBlob, randomSaltHex } from '../lib/crypto';
import { strings } from '../constants/strings';
import { getTodayStr } from '../lib/dateUtils';

interface ToastItem {
  id: string;
  message: string;
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
  openModal: (type: ModalType, payload?: any) => void;
  closeModal: () => void;

  // Timer Actions
  toggleTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  toggleSound: () => void;

  // Drag & Drop Reordering
  reorderSessions: (sourceId: string, targetId: string) => void;
  reorderTaskLists: (sourceId: string, targetId: string) => void;
  reorderTasks: (listId: string, sourceId: string, targetId: string) => void;
  moveCalendarEvent: (eventId: string, targetDate: string, targetTime: string) => void;

  // Sessions CRUD
  setActiveSession: (id: string) => void;
  createSession: (session: Omit<Session, 'id'>) => void;
  updateSession: (id: string, session: Partial<Session>) => void;
  duplicateSession: (id: string) => void;
  deleteSession: (id: string) => void;

  // Lists CRUD
  setActiveList: (id: string) => void;
  createList: (name: string) => void;
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
  addReward: (reward: Omit<Reward, 'id' | 'status'> & { status?: Reward['status'] }) => void;
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

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

// Normalizes a raw (possibly partial/legacy) state object into a valid AppState.
function normalizeState(raw: any): AppState {
  const sessions: Session[] = raw?.sessions?.length ? raw.sessions : DEFAULT_SESSIONS;
  const activeSessionId = raw?.activeSessionId || sessions[0]?.id || 's1';
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const focusMins = activeSession?.focusMinutes || 25;

  return {
    sessions,
    activeSessionId,
    taskLists: raw?.taskLists?.length ? raw.taskLists : DEFAULT_TASK_LISTS,
    activeListId: raw?.activeListId || raw?.taskLists?.[0]?.id || DEFAULT_TASK_LISTS[0].id,
    selectedListIdForTimer: raw?.selectedListIdForTimer || raw?.taskLists?.[0]?.id || DEFAULT_TASK_LISTS[0].id,
    activeActivityStartTime: null,
    taskCompletionLogs: raw?.taskCompletionLogs || [],
    sessionLogs: raw?.sessionLogs || [],
    calendarEvents: raw?.calendarEvents || DEFAULT_CALENDAR_EVENTS,
    calendarDate: raw?.calendarDate || getTodayStr(),
    calendarView: raw?.calendarView || 'week',
    notifications: raw?.notifications ?? { enabled: true, leadMinutes: 10, sound: true },
    goals: raw?.goals?.length ? raw.goals : DEFAULT_GOALS,
    rewards: raw?.rewards?.length ? raw.rewards : DEFAULT_REWARDS,
    timer: {
      phase: 'focus',
      status: 'idle',
      remaining: focusMins * 60,
      total: focusMins * 60,
      sessionsCompletedToday: raw?.timer?.sessionsCompletedToday || 0
    },
    sound: raw?.sound ?? true,
    theme: raw?.theme ?? 'system'
  };
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
  const [activeTab, setActiveTab] = useState<TabType>('timer');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeCelebrationReward, setActiveCelebrationReward] = useState<Reward | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

  const [state, setState] = useState<AppState>(() => normalizeState(null));

  // ── Auth & encrypted data layer ──────────────────────────────────────
  const [authStatus, setAuthStatus] = useState<AuthStatus>('unauthenticated');
  const [profile, setProfile] = useState<Profile | null>(null);
  const tokenRef = useRef<string | null>(null);
  const dataKeyRef = useRef<CryptoKey | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const authStatusRef = useRef<AuthStatus>('unauthenticated');
  authStatusRef.current = authStatus;

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
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const openModal = (type: ModalType, payload?: any) => {
    setActiveModal({ type, payload });
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  // ── Auth actions ─────────────────────────────────────────────────────
  const login = async (username: string, password: string) => {
    const res = await api.post<AuthResponse>('/api/auth/login', { username, password });
    tokenRef.current = res.token;
    let next = normalizeState(null);
    if (res.data.cipher && res.data.iv) {
      const key = await deriveDataKey(password, res.data.salt);
      const plain = await decryptBlob({ iv: res.data.iv, cipher: res.data.cipher }, key);
      next = normalizeState(JSON.parse(plain));
      dataKeyRef.current = key;
    }
    setProfile(res.profile);
    setAuthStatus('authenticated');
    setState(next);
  };

  const setup = async (username: string, displayName: string, password: string) => {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    const res = await api.post<AuthResponse>('/api/auth/setup', { username, displayName, password });
    tokenRef.current = res.token;
    dataKeyRef.current = await deriveDataKey(password, res.data.salt);
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
    showToast(migrated ? 'Existing local data imported into your account.' : 'Welcome! Your main account is ready.');
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
    tokenRef.current = null;
    dataKeyRef.current = null;
    setProfile(null);
    setAuthStatus('unauthenticated');
    setActiveTab('timer');
    setState(() => normalizeState(null));
  };

  const deleteOwnProfile = async (password: string) => {
    await api.del('/api/profile', { password }, tokenRef.current);
    tokenRef.current = null;
    dataKeyRef.current = null;
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

  // Phase completion handler
  const handlePhaseComplete = (skipped = false) => {
    const currentSession = state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0];
    const isFocus = state.timer.phase === 'focus';

    if (isFocus) {
      if (!skipped) {
        playChime('focus');
        showToast('✅ Focus session complete! Time for a break.');

        // Unlock session rewards
        if (currentSession && currentSession.rewardId) {
          setState(prev => ({
            ...prev,
            rewards: prev.rewards.map(r =>
              r.id === currentSession.rewardId && r.status === 'locked'
                ? { ...r, status: 'ready' }
                : r
            )
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
        showToast('☀️ Break over! Ready to focus again.');
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

  // Timer Tick Engine
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.timer.status === 'running') {
      timerRef.current = window.setInterval(() => {
        setState(prev => {
          if (prev.timer.status !== 'running') return prev;

          const nextRemaining = prev.timer.remaining - 1;
          if (nextRemaining <= 0) {
            return {
              ...prev,
              timer: { ...prev.timer, remaining: 0 }
            };
          }

          return {
            ...prev,
            timer: { ...prev.timer, remaining: nextRemaining }
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.timer.status]);

  // Watch for timer reaching 0 while running
  useEffect(() => {
    if (state.timer.status === 'running' && state.timer.remaining <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      handlePhaseComplete(false);
    }
  }, [state.timer.remaining, state.timer.status]);

  // Timer Controls
  const toggleTimer = () => {
    setState(prev => {
      const isRunning = prev.timer.status === 'running';
      if (isRunning) {
        return {
          ...prev,
          timer: { ...prev.timer, status: 'paused' }
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    handlePhaseComplete(true);
  };

  const toggleSound = () => setState(prev => ({ ...prev, sound: !prev.sound }));

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
      showToast(`Event moved to ${targetDate} at ${targetTime}`);
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
    setState(prev => {
      const s = prev.sessions.find(x => x.id === id) || prev.sessions[0];
      const dur = (s?.focusMinutes || 25) * 60;
      return {
        ...prev,
        activeSessionId: id,
        activeActivityStartTime: null,
        timer: { ...prev.timer, phase: 'focus', status: 'idle', remaining: dur, total: dur }
      };
    });
  };

  const createSession = (session: Omit<Session, 'id'>) => {
    const newSession: Session = { ...session, id: uid() };
    setState(prev => ({
      ...prev,
      sessions: [...prev.sessions, newSession],
      activeSessionId: prev.activeSessionId || newSession.id
    }));
    showToast(`Session "${newSession.name}" created.`);
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
      return { ...prev, sessions: updated, timer: timerUpdate };
    });
    showToast('Session updated.');
  };

  const duplicateSession = (id: string) => {
    setState(prev => {
      const target = prev.sessions.find(s => s.id === id);
      if (!target) return prev;
      const dup: Session = { ...target, id: uid(), name: `${target.name} (Copy)` };
      return { ...prev, sessions: [...prev.sessions, dup] };
    });
    showToast('Session duplicated.');
  };

  const deleteSession = (id: string) => {
    setState(prev => {
      const filtered = prev.sessions.filter(s => s.id !== id);
      const nextActiveId = prev.activeSessionId === id ? (filtered[0]?.id || null) : prev.activeSessionId;
      const nextActive = filtered.find(s => s.id === nextActiveId) || filtered[0];
      const mins = nextActive ? nextActive.focusMinutes : 25;
      return {
        ...prev,
        sessions: filtered,
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
    showToast('Session deleted.');
  };

  // ══════════════════════════════════════════════════════════════════════
  // LISTS
  // ══════════════════════════════════════════════════════════════════════
  const setActiveList = (id: string) => setState(prev => ({ ...prev, activeListId: id }));

  const createList = (name: string) => {
    const newList: TaskList = { id: uid(), name, tasks: [] };
    setState(prev => ({
      ...prev,
      taskLists: [...prev.taskLists, newList],
      activeListId: newList.id,
      selectedListIdForTimer: prev.selectedListIdForTimer || newList.id
    }));
    showToast(`List "${name}" created.`);
  };

  const renameList = (id: string, name: string) => {
    setState(prev => ({
      ...prev,
      taskLists: prev.taskLists.map(l => (l.id === id ? { ...l, name } : l))
    }));
    showToast('List renamed.');
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
    showToast('List duplicated.');
  };

  const deleteList = (id: string) => {
    setState(prev => {
      const filtered = prev.taskLists.filter(l => l.id !== id);
      return {
        ...prev,
        taskLists: filtered,
        activeListId: filtered[0]?.id || null,
        selectedListIdForTimer:
          prev.selectedListIdForTimer === id ? (filtered[0]?.id || null) : prev.selectedListIdForTimer
      };
    });
    showToast('List deleted.');
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
        showToast(`✅ Task completed in ${formatDuration(durationSeconds)}!`);
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
    showToast('Task updated.');
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
    showToast(`Event "${newEvent.title}" scheduled.`);
  };

  const updateCalendarEvent = (id: string, event: Partial<CalendarEvent>) => {
    setState(prev => ({
      ...prev,
      calendarEvents: prev.calendarEvents.map(e => (e.id === id ? { ...e, ...event } : e))
    }));
    showToast('Event updated.');
  };

  const duplicateCalendarEvent = (id: string) => {
    setState(prev => {
      const target = prev.calendarEvents.find(e => e.id === id);
      if (!target) return prev;
      const dup: CalendarEvent = { ...target, id: uid(), title: `${target.title} (Copy)` };
      return { ...prev, calendarEvents: [...prev.calendarEvents, dup] };
    });
    showToast('Event duplicated.');
  };

  const deleteCalendarEvent = (id: string) => {
    setState(prev => ({ ...prev, calendarEvents: prev.calendarEvents.filter(e => e.id !== id) }));
    showToast('Event removed.');
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
    setState(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
    showToast(`Goal "${newGoal.name}" created.`);
  };

  const updateGoal = (id: string, goal: Partial<Goal>) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g =>
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
      )
    }));
    showToast('Goal updated.');
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
    showToast('Goal duplicated.');
  };

  const deleteGoal = (id: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== id),
      rewards: prev.rewards.map(r =>
        (r.trigger === 'goal' && r.linkedId === id) ? { ...r, linkedId: null } : r
      )
    }));
    showToast('Goal deleted.');
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
        updatedRewards = prev.rewards.map(r =>
          (r.trigger === 'goal' && r.linkedId === id && r.status === 'locked') ||
          (targetGoal.rewardId && r.id === targetGoal.rewardId && r.status === 'locked')
            ? { ...r, status: 'ready' }
            : r
        );
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
  const addReward = (reward: Omit<Reward, 'id' | 'status'> & { status?: Reward['status'] }) => {
    const newReward: Reward = {
      ...reward,
      id: uid(),
      name: reward.name,
      description: reward.description || reward.desc || '',
      desc: reward.description || reward.desc || '',
      emoji: reward.emoji || reward.icon || '🎁',
      icon: reward.emoji || reward.icon || '🎁',
      status: reward.status || (reward.trigger === 'manual' ? 'ready' : 'locked'),
      claimedAt: null
    };
    setState(prev => ({ ...prev, rewards: [...prev.rewards, newReward] }));
    showToast(`Reward "${newReward.name}" created.`);
  };

  const updateReward = (id: string, reward: Partial<Reward>) => {
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.map(r =>
        r.id === id
          ? {
              ...r,
              ...reward,
              description: reward.description || reward.desc || r.description,
              desc: reward.desc || reward.description || r.desc,
              emoji: reward.emoji || reward.icon || r.emoji,
              icon: reward.icon || reward.emoji || r.icon
            }
          : r
      )
    }));
    showToast('Reward updated.');
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
    showToast('Reward duplicated.');
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
    showToast('Reward deleted.');
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
        reorderSessions,
        reorderTaskLists,
        reorderTasks,
        moveCalendarEvent,
        setActiveSession,
        createSession,
        updateSession,
        duplicateSession,
        deleteSession,
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
        updateTheme
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
