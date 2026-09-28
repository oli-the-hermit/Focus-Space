/** Rewards: create, edit, duplicate, delete and claim. */
import type { ActionDeps } from './types';
import { DEFAULT_REWARD_EMOJI } from '../../constants/defaults';
import { strings } from '../../constants/strings';
import { format } from '../../lib/i18n';
import { uid } from '../../lib/id';
import { Reward } from '../../types';
import type { NewReward } from '../../types';

export function createRewardActions({ setState, showToast, stateRef, setActiveCelebrationReward }: Pick<ActionDeps, 'setState' | 'showToast' | 'stateRef' | 'setActiveCelebrationReward'>) {
  const addReward = (reward: NewReward): string => {
    const linkedSession = reward.linkedSessionId || (reward.trigger === 'session' ? reward.linkedId : null);
    const linkedGoal = reward.linkedGoalId || (reward.trigger === 'goal' ? reward.linkedId : null);
    const inferredTrigger: Reward['trigger'] = reward.trigger || (linkedSession ? 'session' : linkedGoal ? 'goal' : 'manual');

    const newReward: Reward = {
      ...reward,
      id: uid(),
      name: reward.name,
      description: reward.description ?? '',
      emoji: reward.emoji || DEFAULT_REWARD_EMOJI,
      frequency: reward.frequency ?? 'daily',
      trigger: inferredTrigger,
      linkedSessionId: linkedSession,
      linkedGoalId: linkedGoal,
      linkedId: linkedSession || linkedGoal || reward.linkedId || null,
      status: reward.status || (inferredTrigger === 'manual' && !linkedSession && !linkedGoal ? 'ready' : 'locked'),
      claimedAt: null
    };

    setState(prev => {
      const updatedSessions = newReward.linkedSessionId
        ? prev.sessions.map(s => (s.id === newReward.linkedSessionId ? { ...s, rewardId: newReward.id } : s))
        : prev.sessions;

      const updatedGoals = newReward.linkedGoalId
        ? prev.goals.map(g => (g.id === newReward.linkedGoalId ? { ...g, rewardId: newReward.id } : g))
        : prev.goals;

      return {
        ...prev,
        rewards: [...prev.rewards, newReward],
        sessions: updatedSessions,
        goals: updatedGoals
      };
    });
    showToast(format(strings.toasts.rewardCreated, { name: newReward.name }));
    return newReward.id;
  };

  const updateReward = (id: string, reward: Partial<Reward>) => {
    setState(prev => {
      const updatedRewards = prev.rewards.map(r => {
        if (r.id !== id) return r;
        const nextLinkedSession = reward.linkedSessionId !== undefined
          ? reward.linkedSessionId
          : (reward.linkedId && reward.trigger === 'session' ? reward.linkedId : r.linkedSessionId);
        const nextLinkedGoal = reward.linkedGoalId !== undefined
          ? reward.linkedGoalId
          : (reward.linkedId && reward.trigger === 'goal' ? reward.linkedId : r.linkedGoalId);

        let nextTrigger = reward.trigger || r.trigger;
        if (reward.linkedSessionId !== undefined || reward.linkedGoalId !== undefined) {
          if (nextLinkedSession) nextTrigger = 'session';
          else if (nextLinkedGoal) nextTrigger = 'goal';
          else if (!r.linkedId) nextTrigger = 'manual';
        }

        return {
          ...r,
          ...reward,
          emoji: reward.emoji || r.emoji,
          trigger: nextTrigger,
          linkedSessionId: nextLinkedSession,
          linkedGoalId: nextLinkedGoal,
          linkedId: nextLinkedSession || nextLinkedGoal || (reward.linkedId !== undefined ? reward.linkedId : r.linkedId)
        };
      });

      const target = updatedRewards.find(r => r.id === id);
      const targetSessionId = target?.linkedSessionId || (target?.trigger === 'session' ? target?.linkedId : null);
      const targetGoalId = target?.linkedGoalId || (target?.trigger === 'goal' ? target?.linkedId : null);

      let updatedSessions = prev.sessions;
      if (reward.linkedSessionId !== undefined || reward.linkedId !== undefined) {
        updatedSessions = prev.sessions.map(s => {
          if (s.rewardId === id && s.id !== targetSessionId) {
            return { ...s, rewardId: null };
          }
          if (targetSessionId && s.id === targetSessionId) {
            return { ...s, rewardId: id };
          }
          return s;
        });
      }

      let updatedGoals = prev.goals;
      if (reward.linkedGoalId !== undefined || reward.linkedId !== undefined) {
        updatedGoals = prev.goals.map(g => {
          if (g.rewardId === id && g.id !== targetGoalId) {
            return { ...g, rewardId: null };
          }
          if (targetGoalId && g.id === targetGoalId) {
            return { ...g, rewardId: id };
          }
          return g;
        });
      }

      return {
        ...prev,
        rewards: updatedRewards,
        sessions: updatedSessions,
        goals: updatedGoals
      };
    });
    showToast(strings.toasts.rewardUpdated);
  };

  const duplicateReward = (id: string) => {
    setState(prev => {
      const target = prev.rewards.find(r => r.id === id);
      if (!target) return prev;
      const dup: Reward = {
        ...target,
        id: uid(),
        name: format(strings.common.copyOf, { name: target.name }),
        status: target.trigger === 'manual' ? 'ready' : 'locked',
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
