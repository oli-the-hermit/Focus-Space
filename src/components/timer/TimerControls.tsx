import React from 'react';
import { TimerStatus } from '../../types';

export interface TimerControlsProps {
  status: TimerStatus;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  status,
  onToggle,
  onReset,
  onSkip
}) => {
  const isRunning = status === 'running';

  return (
    <div className="timer-controls">
      <button className="ctrl-btn secondary" id="resetBtn" onClick={onReset} title="Reset">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
      <button className="ctrl-btn primary" id="playPauseBtn" onClick={onToggle} title={isRunning ? 'Pause' : 'Start'}>
        {isRunning ? (
          <svg className="icon-pause" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="icon-play" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
      </button>
      <button className="ctrl-btn secondary" id="skipBtn" onClick={onSkip} title="Skip phase">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 4 15 12 5 20 5 4" />
          <line x1="19" y1="5" x2="19" y2="19" />
        </svg>
      </button>
    </div>
  );
};
