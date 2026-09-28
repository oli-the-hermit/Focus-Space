import React, { createContext, useContext, useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import {
  AppState,
  TabType,
  Session,
  Goal,
  Landmark,
  Reward,
  CalendarEvent,
  CalendarView,
  NotificationSettings,
  ModalType,
  ModalPayloadMap,
  ActiveModal,
  Profile,
  ThemeMode,
  NewReward
} from '../types';
import { AlertActionId, AlertPayload } from '../lib/notify';
import { cssDurationMs } from '../lib/theme';
import { TIMING } from '../constants/timing';
import { normalizeState } from '../lib/normalize';
import { createSessionActions } from './actions/sessions';
import { createListActions } from './actions/lists';
import { createCalendarActions } from './actions/calendar';
import { createGoalActions } from './actions/goals';
import { createRewardActions } from './actions/rewards';
import { useAlertState } from './hooks/useAlertState';
import { useAuthSession, type AuthStatus } from './hooks/useAuthSession';
import { useThemeSync } from './hooks/useThemeSync';
import { useTimerEngine } from './hooks/useTimerEngine';
import { useAlerts } from './hooks/useAlerts';
import { uid } from '../lib/id';

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

export type { AuthStatus };

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
  const targetEndTimeRef = useRef<number | null>(null);
  const alertState = useAlertState();
  const { alertRinging, activeAlert, setActiveAlert, dismissAlert } = alertState;

  const showToast = (message: string) => {
    const id = uid();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
      // Removed once the slide-out transition (--dur-2 in toast.css) has played.
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), cssDurationMs('--dur-2'));
    }, TIMING.toastVisibleMs);
  };

  // ── Auth & encrypted data layer (hooks/useAuthSession) ───────────────
  const { authStatus, profile, tokenRef, login, setup, logout, deleteOwnProfile, changePassword, refreshProfile } = useAuthSession({
    state,
    setState,
    showToast,
    targetEndTimeRef,
    onSignedOut: () => {
      setActiveTabState('timer');
      setTourActive(false);
      setHelpOpen(false);
      setActiveAlert(null);
    }
  });

  useThemeSync(state.theme);

  const openModal = ((type: ModalType, payload?: unknown) => {
    setActiveModal({ type, payload } as ActiveModal);
  }) as AppContextType['openModal'];

  const closeModal = () => {
    setActiveModal(null);
  };

  const updateTheme = (theme: ThemeMode) => {
    setState(prev => ({ ...prev, theme }));
  };

  // ── Timer (hooks/useTimerEngine) ─────────────────────────────────────
  const { toggleTimer, resetTimer, skipPhase, toggleSound, syncTimer, getTimerTargetEnd, syncTimerRef, toggleTimerRef } = useTimerEngine({
    state,
    setState,
    showToast,
    targetEndTimeRef,
    alerts: alertState
  });

  const stateRef = useRef(state);
  stateRef.current = state;

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

  // ── Alerts (hooks/useAlerts) ─────────────────────────────────────────
  const { runAlertAction } = useAlerts({
    authStatus,
    stateRef,
    setState,
    alerts: alertState,
    syncTimerRef,
    toggleTimerRef,
    setActiveSessionRef,
    setActiveTab
  });

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
