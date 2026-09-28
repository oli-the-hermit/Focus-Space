/**
 * One name per field. Saved data from earlier versions can still carry the old
 * duplicate fields (Goal.title/type, Landmark.text, Reward.desc/icon/type,
 * Task.created). These read the old names once and return the canonical shape;
 * the next save writes only canonical fields, so the migration is automatic.
 */
import { GOAL_FREQUENCIES, type Goal, type GoalFrequency, type Landmark, type Reward, type Task } from '../types';
import { strings } from '../constants/strings';
import { DEFAULT_REWARD_EMOJI } from '../constants/defaults';

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
  const { desc, icon, type, ...rest } = raw;
  return {
    ...(rest as unknown as Reward),
    name: firstText(rest.name) ?? strings.rewards.untitledReward,
    description: firstText(rest.description, desc) ?? '',
    emoji: firstText(rest.emoji, icon) ?? DEFAULT_REWARD_EMOJI,
    frequency: firstFrequency(rest.frequency, type) ?? 'daily'
  };
}
