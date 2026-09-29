/**
 * What unlocks a reward. The link is stored once, on the unlocker: `rewardId` on a
 * session, goal or landmark. Rewards don't store links; read them from here.
 */
import type { AppState, Reward } from '../types';

type Owners = Pick<AppState, 'sessions' | 'goals'>;

export interface RewardLinks {
  /** The first session that unlocks the reward, if any. */
  sessionId: string | null;
  /** The first goal that unlocks the reward, if any. */
  goalId: string | null;
  landmarkIds: string[];
}

export function rewardLinks(owners: Owners, rewardId: string): RewardLinks {
  return {
    sessionId: owners.sessions.find(s => s.rewardId === rewardId)?.id ?? null,
    goalId: owners.goals.find(g => g.rewardId === rewardId)?.id ?? null,
    landmarkIds: owners.goals.flatMap(g => (g.landmarks || []).filter(l => l.rewardId === rewardId).map(l => l.id))
  };
}

/** Nothing unlocks it, so it can be claimed right away. */
export const isManualReward = (links: RewardLinks): boolean =>
  !links.sessionId && !links.goalId && links.landmarkIds.length === 0;

/**
 * Makes `ownerId` (or nobody, for null) the one item in `items` that unlocks
 * `rewardId`: others that pointed at it are unlinked.
 */
export function assignReward<T extends { id: string; rewardId?: string | null }>(items: T[], rewardId: string, ownerId: string | null): T[] {
  return items.map(item => {
    if (item.id === ownerId) return item.rewardId === rewardId ? item : { ...item, rewardId };
    return item.rewardId === rewardId ? { ...item, rewardId: null } : item;
  });
}

/** The same list with that reward unlocked (locked → ready). */
export function unlockReward(rewards: Reward[], rewardId: string | null | undefined): Reward[] {
  if (!rewardId) return rewards;
  return rewards.map(r => (r.id === rewardId && r.status === 'locked' ? { ...r, status: 'ready' } : r));
}
