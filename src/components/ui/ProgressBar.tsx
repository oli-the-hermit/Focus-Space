import React from 'react';

export interface ProgressBarProps {
  label?: string;
  percentage: number;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ label, percentage, color }) => {
  const clampPct = Math.min(100, Math.max(0, percentage));
  return (
    <div className="list-progress">
      <div className="list-progress-row">
        <span>{label || 'Progress'}</span>
        <span className="list-progress-pct">{Math.round(clampPct)}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${clampPct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};
