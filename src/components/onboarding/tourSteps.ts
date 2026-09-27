import { strings } from '../../constants/strings';
import type { TabType } from '../../types';

export type TourChapter = keyof typeof strings.onboarding.chapters;

export interface TourStep {
  id: string;
  kind: 'welcome' | 'spot' | 'done';
  chapter?: TourChapter;
  /** Page to show before looking for the target. */
  tab?: TabType;
  /** Matches a `data-tour` attribute in the app. */
  target?: string;
  title: string;
  body: string;
}

const s = strings.onboarding.steps;

/**
 * The tour, in order. Steps whose target isn't on screen (e.g. the mini player
 * button in a browser without Picture-in-Picture) are skipped automatically.
 */
export const TOUR_STEPS: TourStep[] = [
  { id: 'welcome', kind: 'welcome', title: strings.onboarding.welcomeTitle, body: strings.onboarding.welcomeBody },

  { id: 'player', kind: 'spot', chapter: 'timer', tab: 'timer', target: 'player', ...s.player },
  { id: 'controls', kind: 'spot', chapter: 'timer', tab: 'timer', target: 'player-controls', ...s.controls },
  { id: 'sessions', kind: 'spot', chapter: 'timer', tab: 'timer', target: 'sessions', ...s.sessions },
  { id: 'session-tasks', kind: 'spot', chapter: 'timer', tab: 'timer', target: 'session-tasks', ...s.sessionTasks },

  { id: 'lists', kind: 'spot', chapter: 'tasks', tab: 'tasks', target: 'lists', ...s.lists },
  { id: 'list-content', kind: 'spot', chapter: 'tasks', tab: 'tasks', target: 'list-content', ...s.listContent },

  { id: 'calendar', kind: 'spot', chapter: 'calendar', tab: 'calendar', target: 'calendar', ...s.calendar },
  { id: 'stats', kind: 'spot', chapter: 'stats', tab: 'stats', target: 'stats', ...s.stats },
  { id: 'goals', kind: 'spot', chapter: 'goals', tab: 'goals', target: 'goals', ...s.goals },
  { id: 'rewards', kind: 'spot', chapter: 'rewards', tab: 'rewards', target: 'rewards', ...s.rewards },

  { id: 'nav', kind: 'spot', chapter: 'space', tab: 'timer', target: 'nav', ...s.nav },
  { id: 'status', kind: 'spot', chapter: 'space', tab: 'timer', target: 'status-chip', ...s.status },
  { id: 'mini', kind: 'spot', chapter: 'space', tab: 'timer', target: 'mini-player-btn', ...s.mini },
  { id: 'alerts', kind: 'spot', chapter: 'space', tab: 'timer', target: 'alerts-btn', ...s.alerts },
  { id: 'help', kind: 'spot', chapter: 'space', tab: 'timer', target: 'help-btn', ...s.help },

  { id: 'done', kind: 'done', title: strings.onboarding.doneTitle, body: strings.onboarding.doneBody }
];

export const TOUR_CHAPTERS = Object.keys(strings.onboarding.chapters) as TourChapter[];
