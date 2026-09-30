/**
 * One name per field. Saved data from earlier versions can still carry the old
 * duplicate fields (Goal.title/type, Landmark.text, Reward.desc/icon/type,
 * Task.created). These read the old names once and return the canonical shape;
 * the next save writes only canonical fields, so the migration is automatic.
 * Reward links saved on the reward (trigger/linkedId/linkedSessionId/linkedGoalId)
 * move to the unlocker's `rewardId` the same way (migrateRewardLinks).
 */
import { GOAL_FREQUENCIES, type AppState, type CalendarEvent, type Goal, type GoalFrequency, type Landmark, type NotificationSettings, type Reward, type Session, type Task, type TaskList } from '../types';
import { strings } from '../constants/strings';
import { DEFAULT_ACCENT, isAccentId } from '../constants/accents';
import { DEFAULT_CALENDAR_EVENTS, DEFAULT_GOALS, DEFAULT_REWARDS, DEFAULT_REWARD_EMOJI, DEFAULT_SESSIONS, DEFAULT_TASK_LISTS } from '../constants/defaults';
import { getTodayStr } from './dateUtils';
import { DEFAULT_AUTO_DISMISS_SEC } from './notify';
import { phaseMinutes } from './sessionTime';

type Raw = Record<string, unknown>;

/** First non-empty string among the candidates. */
const firstText = (...values: unknown[]): string | undefined =>
  values.find((v): v is string => typeof v === 'string' && v.trim() !== '');

const firstFrequency = (...values: unknown[]): GoalFrequency | undefined =>
  values.find((v): v is GoalFrequency => (GOAL_FREQUENCIES as readonly unknown[]).includes(v));

export function normalizeTask(raw: Raw): Task {
  const { created, ...rest } = raw;
  const createdAt = typeof rest.createdAt === 'number' ? rest.createdAt : typeof created === 'number' ? created : undefined;
  return { ...(rest as unknown as Task), createdAt };
}

export function normalizeLandmark(raw: Raw): Landmark {
  const { text, ...rest } = raw;
  return {
    ...(rest as unknown as Landmark),
    name: firstText(rest.name, text) ?? strings.goals.untitledLandmark,
    completed: rest.completed === true
  };
}

export function normalizeGoal(raw: Raw): Goal {
  const { title, type, ...rest } = raw;
  return {
    ...(rest as unknown as Goal),
    name: firstText(rest.name, title) ?? strings.goals.untitledGoal,
    frequency: firstFrequency(rest.frequency, type) ?? 'daily',
    completed: rest.completed === true,
    landmarks: Array.isArray(rest.landmarks) ? (rest.landmarks as Raw[]).map(normalizeLandmark) : []
  };
}

export function normalizeReward(raw: Raw): Reward {
  // Links are read by migrateRewardLinks; the reward itself no longer stores them.
  const { desc, icon, type, trigger: _trigger, linkedId: _linkedId, linkedSessionId: _linkedSessionId, linkedGoalId: _linkedGoalId, ...rest } = raw;
  return {
    ...(rest as unknown as Reward),
    name: firstText(rest.name) ?? strings.rewards.untitledReward,
    description: firstText(rest.description, desc) ?? '',
    emoji: firstText(rest.emoji, icon) ?? DEFAULT_REWARD_EMOJI,
    frequency: firstFrequency(rest.frequency, type) ?? 'daily'
  };
}

/**
 * Older versions also stored a reward's link on the reward itself. Moves each one
 * to the unlocker's `rewardId` unless that unlocker already points at a reward
 * (the unlocker side was always the one the timer and goals read first).
 */
export function migrateRewardLinks(rawRewards: Raw[], sessions: Session[], goals: Goal[]): { sessions: Session[]; goals: Goal[] } {
  const text = (v: unknown) => (typeof v === 'string' && v ? v : null);
  const claim = <T extends { id: string; rewardId?: string | null }>(items: T[], ownerId: string | null, rewardId: string): T[] =>
    ownerId ? items.map(it => (it.id === ownerId && !it.rewardId ? { ...it, rewardId } : it)) : items;

  for (const r of rawRewards) {
    const id = text(r.id);
    if (!id) continue;
    const linked = text(r.linkedId);
    sessions = claim(sessions, text(r.linkedSessionId) ?? (r.trigger === 'session' ? linked : null), id);
    goals = claim(goals, text(r.linkedGoalId) ?? (r.trigger === 'goal' ? linked : null), id);
    if (r.trigger === 'landmark' && linked) {
      goals = goals.map(g => (g.landmarks.some(l => l.id === linked) ? { ...g, landmarks: claim(g.landmarks, linked, id) } : g));
    }
  }
  return { sessions, goals };
}

// Normalizes a raw (possibly partial/legacy) state object into a valid AppState.
export function normalizeState(raw: unknown): AppState {
  const r = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : null;
  const sessions: Session[] = Array.isArray(r?.sessions) && r!.sessions.length
    ? (r!.sessions as Session[])
    : DEFAULT_SESSIONS;
  const activeSessionId = typeof r?.activeSessionId === 'string' ? r.activeSessionId : (sessions[0]?.id || 's1');
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const focusMins = phaseMinutes(activeSession, 'focus');

  const taskLists: TaskList[] = Array.isArray(r?.taskLists) && r!.taskLists.length
    ? (r!.taskLists as TaskList[]).map(l => ({ ...l, tasks: (l.tasks || []).map(t => normalizeTask(t as unknown as Record<string, unknown>)) }))
    : DEFAULT_TASK_LISTS;
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

  const rawRewards = Array.isArray(r?.rewards) && r!.rewards.length ? (r!.rewards as Raw[]) : null;
  const loadedGoals = Array.isArray(r?.goals) && r!.goals.length ? (r!.goals as Raw[]).map(normalizeGoal) : DEFAULT_GOALS;
  const linked = migrateRewardLinks(rawRewards ?? [], migratedSessions, loadedGoals);

  return {
    sessions: linked.sessions,
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
    goals: linked.goals,
    rewards: rawRewards ? rawRewards.map(normalizeReward) : DEFAULT_REWARDS,
    timer: {
      phase: 'focus',
      status: 'idle',
      remaining: focusMins * 60,
      total: focusMins * 60,
      sessionsCompletedToday: typeof (r?.timer as Record<string, unknown> | undefined)?.sessionsCompletedToday === 'number'
        ? ((r!.timer as Record<string, unknown>).sessionsCompletedToday as number)
        : 0,
      // A live run is restored from its own record (loadTimerRun), never from saved data.
      endsAt: null
    },
    sound: typeof r?.sound === 'boolean' ? r.sound : true,
    theme: (r?.theme === 'light' || r?.theme === 'dark' || r?.theme === 'system') ? r.theme : 'system',
    accent: isAccentId(r?.accent) ? r.accent : DEFAULT_ACCENT,
    // Missing on data saved before the tour existed, so every profile sees it once.
    tourSeen: r?.tourSeen === true
  };
}

export function normalizeNotifications(raw: unknown): NotificationSettings {
  const n = (raw && typeof raw === 'object') ? (raw as Partial<NotificationSettings>) : {};
  return {
    enabled: typeof n.enabled === 'boolean' ? n.enabled : true,
    leadMinutes: typeof n.leadMinutes === 'number' && n.leadMinutes > 0 ? n.leadMinutes : 10,
    sound: typeof n.sound === 'boolean' ? n.sound : true,
    phaseAlerts: typeof n.phaseAlerts === 'boolean' ? n.phaseAlerts : true,
    autoDismissSec: typeof n.autoDismissSec === 'number' && n.autoDismissSec > 0 ? n.autoDismissSec : DEFAULT_AUTO_DISMISS_SEC
  };
}
