import { Session, TaskList, Goal, Reward, CalendarEvent } from '../types';
import { getTodayStr } from '../lib/dateUtils';

/** Shown for a reward that has no emoji of its own. */
export const DEFAULT_REWARD_EMOJI = '🎁';

/** Phase lengths (minutes) for a session that doesn't set its own. */
export const DEFAULT_FOCUS_MINUTES = 25;
export const DEFAULT_BREAK_MINUTES = 5;

export const DEFAULT_SESSIONS: Session[] = [
  { id: 's1', name: 'Pomodoro Classic', focusMinutes: 25, breakMinutes: 5, rewardId: 'r1' },
  { id: 's2', name: 'Deep Work', focusMinutes: 50, breakMinutes: 10, rewardId: 'r2' },
  { id: 's3', name: 'Quick Sprint', focusMinutes: 15, breakMinutes: 3, rewardId: null }
];

export const DEFAULT_TASK_LISTS: TaskList[] = [
  {
    id: 'tl1',
    name: 'Project Tasks',
    tasks: [
      { id: 't1', text: 'Review sprint deliverables', completed: false, createdAt: Date.now() - 3600000, durationSeconds: null },
      { id: 't2', text: 'Write feature documentation', completed: false, createdAt: Date.now() - 7200000, durationSeconds: null },
      { id: 't3', text: 'Test calendar and time tracking', completed: false, createdAt: Date.now(), durationSeconds: null }
    ]
  }
];

export const DEFAULT_GOALS: Goal[] = [
  {
    id: 'g1',
    name: 'Complete 4 Focus Sessions',
    frequency: 'daily',
    target: 4,
    current: 1,
    completed: false,
    rewardId: 'r3',
    landmarks: [
      { id: 'lm1', name: 'Finish 1st morning session', completed: true, rewardId: null },
      { id: 'lm2', name: 'Finish 2nd afternoon session', completed: false, rewardId: null }
    ]
  },
  {
    id: 'g2',
    name: 'Clear 10 Tasks this Week',
    frequency: 'weekly',
    target: 10,
    current: 3,
    completed: false,
    rewardId: null,
    landmarks: []
  }
];

export const DEFAULT_REWARDS: Reward[] = [
  {
    id: 'r1',
    name: '15-Minute Coffee Break',
    description: 'Enjoy a warm cup of coffee or tea completely guilt-free.',
    emoji: '☕',
    frequency: 'daily',
    status: 'locked',
    claimedAt: null
  },
  {
    id: 'r2',
    name: 'Favorite Podcast Episode',
    description: 'Listen to 1 episode of your favorite podcast.',
    emoji: '🎧',
    frequency: 'daily',
    status: 'locked',
    claimedAt: null
  },
  {
    id: 'r3',
    name: 'Walk in the Park',
    description: 'Take a relaxing 20-minute walk outside.',
    emoji: '🌿',
    frequency: 'weekly',
    status: 'ready',
    claimedAt: null
  }
];

export const DEFAULT_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'ev1',
    title: 'Deep Work Session',
    date: getTodayStr(),
    startTime: '09:00',
    durationMins: 50,
    sessionId: 's2',
    taskListId: 'tl1',
    details: 'Focus on core tasks'
  },
  {
    id: 'ev2',
    title: 'Sprint Review',
    date: getTodayStr(),
    startTime: '11:30',
    durationMins: 25,
    sessionId: 's1',
    taskListId: 'tl1',
    details: 'Review progress'
  }
];
