export type TabType = 'timer' | 'tasks' | 'calendar' | 'stats' | 'goals' | 'rewards';
export type TimerPhase = 'focus' | 'break';
export type TimerStatus = 'idle' | 'running' | 'paused';
export type CalendarView = 'week' | 'day' | 'month';
export const GOAL_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly', 'custom'] as const;
export type GoalFrequency = (typeof GOAL_FREQUENCIES)[number];
export type RewardStatus = 'locked' | 'ready' | 'claimed';
export type UserRole = 'owner' | 'user';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Profile {
  id: number;
  username: string;
  displayName: string;
  avatar: string; // data URL or ''
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt?: number;
  completedAt?: number | null;
  durationSeconds?: number | null;
}

export interface TaskList {
  id: string;
  name: string;
  tasks: Task[];
}

export interface Session {
  id: string;
  name: string;
  focusMinutes: number;
  breakMinutes: number;
  rewardId?: string | null;
  taskListIds?: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMins: number;
  details?: string;
  notified?: boolean;
  sessionId?: string | null;
  taskListId?: string | null;
}

export interface Landmark {
  id: string;
  name: string;
  completed: boolean;
  rewardId?: string | null;
  rewardName?: string;
  startDate?: string | null; // YYYY-MM-DD
  dueDate?: string | null; // YYYY-MM-DD
}

export interface Goal {
  id: string;
  name: string;
  frequency: GoalFrequency;
  target?: number;
  current?: number;
  completed: boolean;
  rewardId?: string | null;
  landmarks: Landmark[];
  startDate?: string | null; // YYYY-MM-DD
  dueDate?: string | null; // YYYY-MM-DD
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  emoji: string;
  frequency: GoalFrequency;
  /** What unlocks it is stored on the unlocker (`rewardId`); see lib/rewardLinks. */
  status: RewardStatus;
  claimedAt?: number | null;
}

/** What callers pass to addReward: the rest is filled in (id, status, defaults). */
export type NewReward = Omit<Reward, 'id' | 'status' | 'description' | 'emoji' | 'frequency'> &
  Partial<Pick<Reward, 'status' | 'description' | 'emoji' | 'frequency'>>;

export interface TaskCompletionLog {
  id: string;
  taskId: string;
  taskText: string;
  durationSeconds: number;
  listId: string;
  listName: string;
  timestamp: number;
  date: string;
}

export interface SessionLog {
  id: string;
  sessionId: string;
  sessionName: string;
  durationMins: number;
  date: string;
  timestamp: number;
  dayOfWeek: number;
}

export interface NotificationSettings {
  /** Reminders before scheduled calendar sessions. */
  enabled: boolean;
  leadMinutes: number;
  sound: boolean;
  /** Alert (with a "start next" action) when a focus or break phase ends. */
  phaseAlerts: boolean;
  /** Seconds before an alert hides itself. */
  autoDismissSec: number;
}

export interface TimerState {
  phase: TimerPhase;
  status: TimerStatus;
  remaining: number;
  total: number;
  sessionsCompletedToday: number;
  /** When the running phase ends (ms since epoch); null unless running. */
  endsAt: number | null;
}

export interface AppState {
  sessions: Session[];
  activeSessionId: string | null;

  taskLists: TaskList[];
  activeListId: string | null;

  selectedListIdForTimer: string | null;
  activeActivityStartTime: number | null;

  taskCompletionLogs: TaskCompletionLog[];
  sessionLogs: SessionLog[];

  calendarEvents: CalendarEvent[];
  calendarDate: string;
  calendarView: CalendarView;

  notifications: NotificationSettings;

  goals: Goal[];
  rewards: Reward[];

  timer: TimerState;
  sound: boolean;
  theme: ThemeMode;
  /** The onboarding tour was finished or closed on this profile. */
  tourSeen: boolean;
}

export type ModalType =
  | 'NEW_SESSION'
  | 'EDIT_SESSION'
  | 'NEW_LIST'
  | 'RENAME_LIST'
  | 'NEW_TASK'
  | 'RENAME_TASK'
  | 'SCHEDULE_EVENT'
  | 'EDIT_EVENT'
  | 'NEW_GOAL'
  | 'EDIT_GOAL'
  | 'NEW_LANDMARK'
  | 'EDIT_LANDMARK'
  | 'NEW_REWARD'
  | 'EDIT_REWARD'
  | 'CONFIRM_DELETE'
  | 'NOTIFICATIONS';

export interface ConfirmDeletePayload {
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export interface ModalPayloadMap {
  NEW_SESSION: { taskListIds?: string[] } | undefined;
  EDIT_SESSION: { session?: Session | null };
  NEW_LIST: undefined;
  RENAME_LIST: { list?: TaskList | null };
  NEW_TASK: { listId: string };
  RENAME_TASK: { listId: string; task?: Task | null };
  SCHEDULE_EVENT: { date?: string; time?: string };
  EDIT_EVENT: { event?: CalendarEvent | null };
  NEW_GOAL: undefined;
  EDIT_GOAL: { goal?: Goal | null };
  NEW_LANDMARK: { goalId: string };
  EDIT_LANDMARK: { goalId: string; landmark?: Landmark | null };
  NEW_REWARD: undefined;
  EDIT_REWARD: { reward?: Reward | null };
  CONFIRM_DELETE: ConfirmDeletePayload;
  NOTIFICATIONS: undefined;
}

export type ActiveModal = {
  [K in ModalType]: undefined extends ModalPayloadMap[K]
    ? { type: K; payload?: ModalPayloadMap[K] }
    : { type: K; payload: ModalPayloadMap[K] };
}[ModalType];
