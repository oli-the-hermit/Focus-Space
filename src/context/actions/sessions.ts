/** Timer sessions: create, edit, duplicate, delete, reorder, pick the active one. */
import type { ActionDeps } from './types';
import { strings } from '../../constants/strings';
import { cancelDesktopAlert, isTauri } from '../../lib/desktop';
import { format } from '../../lib/i18n';
import { uid } from '../../lib/id';
import { clearTimerRun } from '../../lib/storage';
import { Session } from '../../types';
import { phaseMinutes } from '../../lib/sessionTime';

export function createSessionActions({ setState, showToast, targetEndTimeRef }: Pick<ActionDeps, 'setState' | 'showToast' | 'targetEndTimeRef'>) {
  const reorderSessions = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setState(prev => {
      const fromIdx = prev.sessions.findIndex(s => s.id === sourceId);
      const toIdx = prev.sessions.findIndex(s => s.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const updated = [...prev.sessions];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return { ...prev, sessions: updated };
    });
  };

  const setActiveSession = (id: string) => {
    if (isTauri()) cancelDesktopAlert().catch(() => {});
    targetEndTimeRef.current = null;
    clearTimerRun();
    setState(prev => {
      const s = prev.sessions.find(x => x.id === id) || prev.sessions[0];
      const dur = phaseMinutes(s, 'focus') * 60;
      return {
        ...prev,
        activeSessionId: id,
        selectedListIdForTimer: s?.taskListIds?.[0] ?? prev.selectedListIdForTimer,
        activeActivityStartTime: null,
        timer: { ...prev.timer, phase: 'focus', status: 'idle', remaining: dur, total: dur }
      };
    });
  };

  const createSession = (session: Omit<Session, 'id'>): string => {
    const newSession: Session = { ...session, taskListIds: session.taskListIds ? [...session.taskListIds] : [], id: uid() };
    setState(prev => {
      const updatedRewards = newSession.rewardId
        ? prev.rewards.map(r =>
            r.id === newSession.rewardId
              ? { ...r, linkedSessionId: newSession.id, linkedId: newSession.id, trigger: 'session' as const }
              : r
          )
        : prev.rewards;

      return {
        ...prev,
        sessions: [...prev.sessions, newSession],
        rewards: updatedRewards,
        activeSessionId: prev.activeSessionId || newSession.id
      };
    });
    showToast(format(strings.toasts.sessionCreated, { name: newSession.name }));
    return newSession.id;
  };

  const updateSession = (id: string, session: Partial<Session>) => {
    setState(prev => {
      const updated = prev.sessions.map(s => (s.id === id ? { ...s, ...session } : s));
      const activeS = updated.find(s => s.id === prev.activeSessionId) || updated[0];
      let timerUpdate = prev.timer;
      if (prev.activeSessionId === id && prev.timer.status === 'idle') {
        const mins = phaseMinutes(activeS, prev.timer.phase);
        timerUpdate = { ...prev.timer, remaining: mins * 60, total: mins * 60 };
      }

      let updatedRewards = prev.rewards;
      if (session.rewardId !== undefined) {
        updatedRewards = prev.rewards.map(r => {
          // Unlink previously linked reward if it changed
          if ((r.linkedSessionId === id || (r.trigger === 'session' && r.linkedId === id)) && r.id !== session.rewardId) {
            return {
              ...r,
              linkedSessionId: null,
              linkedId: r.linkedGoalId || null,
              trigger: r.linkedGoalId ? ('goal' as const) : ('manual' as const)
            };
          }
          // Link new reward
          if (session.rewardId && r.id === session.rewardId) {
            return {
              ...r,
              linkedSessionId: id,
              linkedId: id,
              trigger: 'session' as const
            };
          }
          return r;
        });
      }

      return { ...prev, sessions: updated, rewards: updatedRewards, timer: timerUpdate };
    });
    showToast(strings.toasts.sessionUpdated);
  };

  const duplicateSession = (id: string) => {
    setState(prev => {
      const target = prev.sessions.find(s => s.id === id);
      if (!target) return prev;
      const dup: Session = {
        ...target,
        id: uid(),
        name: format(strings.common.copyOf, { name: target.name }),
        taskListIds: [...(target.taskListIds || [])]
      };
      return { ...prev, sessions: [...prev.sessions, dup] };
    });
    showToast(strings.toasts.sessionDuplicated);
  };

  const deleteSession = (id: string) => {
    setState(prev => {
      const filtered = prev.sessions.filter(s => s.id !== id);
      const nextActiveId = prev.activeSessionId === id ? (filtered[0]?.id || null) : prev.activeSessionId;
      const nextActive = filtered.find(s => s.id === nextActiveId) || filtered[0];
      const mins = phaseMinutes(nextActive, 'focus');

      const updatedRewards = prev.rewards.map(r => {
        if (r.linkedSessionId === id || (r.trigger === 'session' && r.linkedId === id)) {
          return {
            ...r,
            linkedSessionId: null,
            linkedId: r.linkedGoalId || null,
            trigger: r.linkedGoalId ? ('goal' as const) : ('manual' as const)
          };
        }
        return r;
      });

      return {
        ...prev,
        sessions: filtered,
        rewards: updatedRewards,
        activeSessionId: nextActiveId,
        timer: {
          ...prev.timer,
          status: 'idle',
          phase: 'focus',
          remaining: mins * 60,
          total: mins * 60
        }
      };
    });
    showToast(strings.toasts.sessionDeleted);
  };

  // Silent on purpose: called from inline pickers, where a toast per change is noise.
  const setSessionTaskLists = (sessionId: string, listIds: string[]) => {
    const unique = Array.from(new Set(listIds));
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => (s.id === sessionId ? { ...s, taskListIds: unique } : s)),
      selectedListIdForTimer: prev.activeSessionId === sessionId ? (unique[0] || null) : prev.selectedListIdForTimer
    }));
  };

  return { reorderSessions, setActiveSession, createSession, updateSession, duplicateSession, deleteSession, setSessionTaskLists };
}
