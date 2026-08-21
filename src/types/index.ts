export type TabType = 'timer' | 'agenda' | 'tasks' | 'calendar' | 'stats' | 'goals' | 'rewards';
export type TimerPhase = 'focus' | 'break';
export type TimerStatus = 'idle' | 'running' | 'paused';
export type CalendarView = 'week' | 'day' | 'month';
export type GoalFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type RewardStatus = 'locked' | 'ready' | 'claimed';
export type RewardTrigger = 'session' | 'landmark' | 'goal' | 'manual' | 'task';
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
  created?: number;
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
  text?: string;
  completed: boolean;
  rewardId?: string | null;
  rewardName?: string;
}

export interface Goal {
  id: string;
  name: string;
  title?: string;
  type: GoalFrequency;
  frequency?: GoalFrequency;
  target?: number;
  current?: number;
  completed: boolean;
  rewardId?: string | null;
  landmarks: Landmark[];
}

export interface Reward {
  id: string;
  name: string;
  description?: string;
  desc?: string;
  emoji?: string;
  icon?: string;
  frequency?: GoalFrequency;
  type?: GoalFrequency;
  trigger: RewardTrigger;
  linkedId?: string | null;
  linkedSessionId?: string | null;
  linkedGoalId?: string | null;
  status: RewardStatus;
  claimedAt?: number | null;
}

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
  enabled: boolean;
  leadMinutes: number;
  sound: boolean;
}

export interface TimerState {
  phase: TimerPhase;
  status: TimerStatus;
  remaining: number;
  total: number;
  sessionsCompletedToday: number;
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
  | 'CONFIRM_DELETE';

export interface ActiveModal {
  type: ModalType;
  payload?: any;
}
