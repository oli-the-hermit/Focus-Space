import React from 'react';

export interface TimerRingProps {
  remainingSec: number;
  totalSec: number;
  sessionName: string;
  phase: 'focus' | 'break';
}

export const TimerRing: React.FC<TimerRingProps> = ({
  remainingSec,
  totalSec,
  sessionName,
  phase
}) => {
  const safeSec = Math.max(0, isNaN(remainingSec) ? 0 : remainingSec);
  const safeTotal = Math.max(1, isNaN(totalSec) ? 1500 : totalSec);

  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  const digits = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const circumference = 603.2; // 2 * pi * 96
  const pct = safeTotal > 0 ? (safeTotal - safeSec) / safeTotal : 0;
  const strokeOffset = circumference * (1 - pct);

  return (
    <div className="ring-wrapper">
      <svg className="ring-svg" viewBox="0 0 220 220">
        <circle className="ring-track" cx="110" cy="110" r="96" />
        <circle
          id="ringProg"
          className={`ring-prog ${phase === 'break' ? 'break-phase' : ''}`}
          cx="110"
          cy="110"
          r="96"
          style={{ strokeDashoffset: strokeOffset }}
        />
      </svg>
      <div className="ring-inner">
        <div className="timer-digits" id="timerDigits">{digits}</div>
        <div className="timer-session" id="timerSessionName">{sessionName}</div>
      </div>
    </div>
  );
};
