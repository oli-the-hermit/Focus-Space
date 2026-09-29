/** Rewards: create, edit, duplicate, delete and claim. */
import type { ActionDeps } from './types';
import { DEFAULT_REWARD_EMOJI } from '../../constants/defaults';
import { strings } from '../../constants/strings';
import { format } from '../../lib/i18n';
import { uid } from '../../lib/id';
import { assignReward, rewardLinks } from '../../lib/rewardLinks';
import { Reward } from '../../types';
import type { NewReward } from '../../types';

/** The session and goal that unlock a reward, as picked in the reward form. */
export interface RewardLinkChoice {
  sessionId: string | null;
  goalId: string | null;
}

export function createRewardActions({ setState, showToast, stateRef, setActiveCelebrationReward }: Pick<ActionDeps, 'setState' | 'showToast' | 'stateRef' | 'setActiveCelebrationReward'>) {
  const addReward = (reward: NewReward, links?: Partial<RewardLinkChoice>): string => {
    const linked = !!(links?.sessionId || links?.goalId);
    const newReward: Reward = {
      ...reward,
      id: uid(),
      name: reward.name,
      description: reward.description ?? '',
      emoji: reward.emoji || DEFAULT_REWARD_EMOJI,
      frequency: reward.frequency ?? 'daily',
      // Nothing unlocks a manual reward, so it starts claimable.
      status: reward.status || (linked ? 'locked' : 'ready'),
      claimedAt: null
    };

    setState(prev => ({
      ...prev,
      rewards: [...prev.rewards, newReward],
      sessions: links?.sessionId ? assignReward(prev.sessions, newReward.id, links.sessionId) : prev.sessions,
      goals: links?.goalId ? assignReward(prev.goals, newReward.id, links.goalId) : prev.goals
    }));
    showToast(format(strings.toasts.rewardCreated, { name: newReward.name }));
    return newReward.id;
  };

  /** With `links`, a changed session or goal replaces every earlier one of that kind. */
  const updateReward = (id: string, reward: Partial<Reward>, links?: RewardLinkChoice) => {
    setState(prev => {
      const current = rewardLinks(prev, id);
      return {
        ...prev,
        rewards: prev.rewards.map(r => (r.id === id ? { ...r, ...reward, emoji: reward.emoji || r.emoji } : r)),
        sessions: links && links.sessionId !== current.sessionId ? assignReward(prev.sessions, id, links.sessionId) : prev.sessions,
        goals: links && links.goalId !== current.goalId ? assignReward(prev.goals, id, links.goalId) : prev.goals
      };
    });
    showToast(strings.toasts.rewardUpdated);
  };

  const duplicateReward = (id: string) => {
    setState(prev => {
      const target = prev.rewards.find(r => r.id === id);
      if (!target) return prev;
      // The copy isn't linked to anything (links live on the unlockers), so it's claimable.
      const dup: Reward = {
        ...target,
        id: uid(),
        name: format(strings.common.copyOf, { name: target.name }),
        status: 'ready',
        claimedAt: null
      };
      return { ...prev, rewards: [...prev.rewards, dup] };
    });
    showToast(strings.toasts.rewardDuplicated);
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
    showToast(strings.toasts.rewardDeleted);
  };

  const claimReward = (id: string) => {
    // Decide outside the updater, which React may run twice.
    const target = stateRef.current.rewards.find(r => r.id === id);
    if (!target || target.status !== 'ready') return;
    setActiveCelebrationReward(target);
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.map(r => (r.id === id ? { ...r, status: 'claimed', claimedAt: Date.now() } : r))
    }));
  };

  return { addReward, updateReward, duplicateReward, deleteReward, claimReward };
}
