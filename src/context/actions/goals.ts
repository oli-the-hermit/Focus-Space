/** Goals and their landmarks. */
import type { ActionDeps } from './types';
import { strings } from '../../constants/strings';
import { format } from '../../lib/i18n';
import { uid } from '../../lib/id';
import { unlockReward } from '../../lib/rewardLinks';
import { Goal, Landmark } from '../../types';

export function createGoalActions({ setState, showToast }: Pick<ActionDeps, 'setState' | 'showToast'>) {
  const addGoal = (goal: Omit<Goal, 'id' | 'completed'>) => {
    const newGoal: Goal = {
      ...goal,
      id: uid(),
      name: goal.name || strings.goals.untitledGoal,
      frequency: goal.frequency || 'daily',
      target: goal.target || 4,
      current: 0,
      completed: false,
      landmarks: goal.landmarks || []
    };
    setState(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
    showToast(format(strings.toasts.goalCreated, { name: newGoal.name }));
  };

  const updateGoal = (id: string, goal: Partial<Goal>) => {
    setState(prev => {
      const updated = prev.goals.map(g =>
        g.id === id
          ? {
              ...g,
              ...goal,
              name: goal.name || g.name,
              frequency: goal.frequency || g.frequency
            }
          : g
      );

      return { ...prev, goals: updated };
    });
    showToast(strings.toasts.goalUpdated);
  };

  const duplicateGoal = (id: string) => {
    setState(prev => {
      const target = prev.goals.find(g => g.id === id);
      if (!target) return prev;
      const dup: Goal = {
        ...target,
        id: uid(),
        name: format(strings.common.copyOf, { name: target.name }),
        landmarks: (target.landmarks || []).map(l => ({ ...l, id: uid(), completed: false }))
      };
      return { ...prev, goals: [...prev.goals, dup] };
    });
    showToast(strings.toasts.goalDuplicated);
  };

  const deleteGoal = (id: string) => {
    setState(prev => ({ ...prev, goals: prev.goals.filter(g => g.id !== id) }));
    showToast(strings.toasts.goalDeleted);
  };

  const toggleGoal = (id: string) => {
    setState(prev => {
      const updated = prev.goals.map(g => {
        if (g.id !== id) return g;
        const nextCompleted = !g.completed;
        return {
          ...g,
          completed: nextCompleted,
          current: nextCompleted ? (g.target || 1) : 0
        };
      });

      // Completing the goal unlocks its reward
      const targetGoal = updated.find(g => g.id === id);
      return {
        ...prev,
        goals: updated,
        rewards: targetGoal?.completed ? unlockReward(prev.rewards, targetGoal.rewardId) : prev.rewards
      };
    });
  };

  const addLandmark = (goalId: string, landmark: Omit<Landmark, 'id'>) => {
    const newLm: Landmark = {
      ...landmark,
      id: uid(),
      name: landmark.name || strings.goals.untitledLandmark,
      completed: false
    };
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g =>
        g.id === goalId ? { ...g, landmarks: [...(g.landmarks || []), newLm] } : g
      )
    }));
  };

  const updateLandmark = (goalId: string, landmarkId: string, landmark: Partial<Landmark>) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => {
        if (g.id !== goalId || !g.landmarks) return g;
        return {
          ...g,
          landmarks: g.landmarks.map(l =>
            l.id === landmarkId
              ? {
                  ...l,
                  ...landmark,
                  name: landmark.name || l.name
                }
              : l
          )
        };
      })
    }));
  };

  const duplicateLandmark = (goalId: string, landmarkId: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => {
        if (g.id !== goalId || !g.landmarks) return g;
        const target = g.landmarks.find(l => l.id === landmarkId);
        if (!target) return g;
        const copy: Landmark = { ...target, id: uid(), completed: false };
        const idx = g.landmarks.indexOf(target);
        const newLms = [...g.landmarks];
        newLms.splice(idx + 1, 0, copy);
        return { ...g, landmarks: newLms };
      })
    }));
  };

  const deleteLandmark = (goalId: string, landmarkId: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => {
        if (g.id !== goalId || !g.landmarks) return g;
        return { ...g, landmarks: g.landmarks.filter(l => l.id !== landmarkId) };
      })
    }));
  };

  const toggleLandmark = (goalId: string, landmarkId: string) => {
    setState(prev => {
      let landmarkCompleted = false;
      let landmarkRewardId: string | null | undefined = null;

      const updatedGoals = prev.goals.map(g => {
        if (g.id !== goalId || !g.landmarks) return g;
        const updatedLm = g.landmarks.map(lm => {
          if (lm.id === landmarkId) {
            const comp = !lm.completed;
            landmarkCompleted = comp;
            landmarkRewardId = lm.rewardId;
            return { ...lm, completed: comp };
          }
          return lm;
        });
        const compCount = updatedLm.filter(lm => lm.completed).length;
        const allCompleted = updatedLm.length > 0 && compCount === updatedLm.length;
        return {
          ...g,
          landmarks: updatedLm,
          current: compCount,
          completed: allCompleted
        };
      });

      // Unlock landmark and goal rewards if newly completed
      let updatedRewards = prev.rewards;
      if (landmarkCompleted) {
        updatedRewards = unlockReward(updatedRewards, landmarkRewardId);
        const targetGoal = updatedGoals.find(g => g.id === goalId);
        if (targetGoal?.completed) updatedRewards = unlockReward(updatedRewards, targetGoal.rewardId);
      }

      return {
        ...prev,
        goals: updatedGoals,
        rewards: updatedRewards
      };
    });
  };

  return { addGoal, updateGoal, duplicateGoal, deleteGoal, toggleGoal, addLandmark, updateLandmark, duplicateLandmark, deleteLandmark, toggleLandmark };
}
