/** Timer sessions: create, edit, duplicate, delete, reorder, pick the active one. */
import type { ActionDeps } from './types';
import { strings } from '../../constants/strings';
import { format } from '../../lib/i18n';
import { uid } from '../../lib/id';
import { Session } from '../../types';
import { idleTimer, phaseMinutes } from '../../lib/sessionTime';
import { moveById } from '../../lib/reorder';

export function createSessionActions({ setState, showToast, stopTicker }: Pick<ActionDeps, 'setState' | 'showToast' | 'stopTicker'>) {
  const reorderSessions = (sourceId: string, targetId: string) => {
    setState(prev => {
      const sessions = moveById(prev.sessions, sourceId, targetId);
      return sessions ? { ...prev, sessions } : prev;
    });
  };

  const setActiveSession = (id: string) => {
    // Switching sessions stops the run; the timer engine clears its record and alert.
    stopTicker();
    setState(prev => {
      const s = prev.sessions.find(x => x.id === id) || prev.sessions[0];
      return {
        ...prev,
        activeSessionId: id,
        selectedListIdForTimer: s?.taskListIds?.[0] ?? prev.selectedListIdForTimer,
        activeActivityStartTime: null,
        timer: idleTimer(prev.timer, s, 'focus')
      };
    });
  };

  const createSession = (session: Omit<Session, 'id'>): string => {
    const newSession: Session = { ...session, taskListIds: session.taskListIds ? [...session.taskListIds] : [], id: uid() };
    setState(prev => ({
      ...prev,
      sessions: [...prev.sessions, newSession],
      activeSessionId: prev.activeSessionId || newSession.id
    }));
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

      return { ...prev, sessions: updated, timer: timerUpdate };
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

      return {
        ...prev,
        sessions: filtered,
        activeSessionId: nextActiveId,
        timer: idleTimer(prev.timer, nextActive, 'focus')
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
