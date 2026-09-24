import React from 'react';

export interface StatusDotProps {
  status?: 'idle' | 'running' | 'paused' | 'break';
  label?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status = 'idle', label }) => {
  return (
    <div className={`status-chip is-${status}`}>
      <span className="status-chip-main">
        <span className={`status-dot ${status}`} />
        {label && <span>{label}</span>}
      </span>
    </div>
  );
};
