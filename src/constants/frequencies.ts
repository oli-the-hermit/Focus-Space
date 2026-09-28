import { GOAL_FREQUENCIES, GoalFrequency } from '../types';
import { strings } from './strings';

/** Display label for a goal or reward frequency. */
export const frequencyLabel = (f: GoalFrequency): string => strings.frequency[f];

/** Select options for every frequency, in order. */
export const FREQUENCY_OPTIONS = GOAL_FREQUENCIES.map(f => ({ value: f, label: frequencyLabel(f) }));

/** Filter tabs for the Goals and Rewards grids: "All" plus every frequency. */
export const FREQUENCY_FILTER_TABS = [
  { key: 'all', label: strings.frequency.all },
  ...GOAL_FREQUENCIES.map(f => ({ key: f, label: frequencyLabel(f) }))
];
