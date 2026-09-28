import React from 'react';
import { cx } from '../../lib/cx';

export interface ProgressBarProps {
  /** 0–100; values outside are clamped. */
  value: number;
  size?: 'md' | 'lg';
  /** Finished: the fill switches to the success color. */
  complete?: boolean;
  /** Accessible name, e.g. "Session progress". */
  label?: string;
  className?: string;
}

/**
 * Horizontal progress track (styles: components/progress.css). The track color
 * follows the container through --progress-track.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ value, size = 'md', complete = false, label, className }) => {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cx('progress-track', size === 'lg' && 'lg', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div className={cx('progress-fill', complete && 'is-complete')} style={{ width: `${pct}%` }} />
    </div>
  );
};
