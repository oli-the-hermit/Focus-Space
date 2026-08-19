import React from 'react';

export interface ProgressBarProps {
  label?: string;
  percentage: number;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ label, percentage, color }) => {
  const clampPct = Math.min(100, Math.max(0, percentage));
  return (
    <div className="session-progress-box">
      <div className="session-progress-info">
        <span>{label || 'Progress'}</span>
        <span className="session-progress-pct">{Math.round(clampPct)}%</span>
      </div>
      <div className="session-progress-track">
        <div
          className="session-progress-fill"
          style={{ width: `${clampPct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};
