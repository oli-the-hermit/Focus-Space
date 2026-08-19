import React from 'react';
import { useApp } from '../../context/AppContext';
import { TimerRing } from './TimerRing';
import { TimerControls } from './TimerControls';

export const TimerCard: React.FC = () => {
  const { state, toggleTimer, resetTimer, skipPhase } = useApp();

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0];
  const attachedReward = activeSession?.rewardId ? state.rewards.find(r => r.id === activeSession.rewardId) : null;

  const defaultMins = state.timer.phase === 'focus' ? (activeSession?.focusMinutes || 25) : (activeSession?.breakMinutes || 5);
  const total = state.timer.total > 0 ? state.timer.total : defaultMins * 60;
  const remaining = state.timer.remaining >= 0 ? state.timer.remaining : total;
  const pct = total > 0 ? Math.min(100, Math.max(0, Math.round(((total - remaining) / total) * 100))) : 0;

  return (
    <div className="card timer-card">
      <div className={`phase-label ${state.timer.phase === 'break' ? 'break-phase' : ''}`} id="phaseLabel">
        {state.timer.phase === 'focus' ? 'Focus' : 'Break'}
      </div>

      <TimerRing
        remainingSec={remaining}
        totalSec={total}
        sessionName={activeSession ? activeSession.name : 'No session'}
        phase={state.timer.phase}
      />

      <TimerControls
        status={state.timer.status}
        onToggle={toggleTimer}
        onReset={resetTimer}
        onSkip={skipPhase}
      />

      <div className="session-progress-box" id="sessionProgressBox">
        <div className="session-progress-info">
          <span>Session Progress</span>
          <span className="session-progress-pct" id="sessionProgressPct">{pct}%</span>
        </div>
        <div className="session-progress-track">
          <div className="session-progress-fill" id="sessionProgressFill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {attachedReward && (
        <div className="session-reward-hint" id="sessionRewardHint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 12 20 22 4 22 4 12" />
            <rect x="2" y="7" width="20" height="5" />
            <line x1="12" y1="22" x2="12" y2="7" />
          </svg>
          Reward on completion: <strong id="sessionRewardName">{attachedReward.name}</strong>
        </div>
      )}
    </div>
  );
};
