import React from 'react';
import { cx } from '../../lib/cx';

export interface ProgressRingProps {
  /** How much of the ring is filled, 0–1. */
  value: number;
  /** Side of the square viewBox. Stroke widths are in these units (set in CSS). */
  box?: number;
  /** Circle radius in viewBox units; leave room for half the stroke width. */
  radius?: number;
  className?: string;
}

/**
 * A circular progress indicator, decorative (aria-hidden): pair it with visible
 * text or a labelled control. Colors, stroke widths and rotation come from CSS
 * via .progress-ring-track and .progress-ring-fill.
 */
export const ProgressRing: React.FC<ProgressRingProps> = ({ value, box = 100, radius = 46, className }) => {
  const circumference = 2 * Math.PI * radius;
  const center = box / 2;
  const filled = Math.min(1, Math.max(0, value));
  return (
    <svg className={cx('progress-ring', className)} viewBox={`0 0 ${box} ${box}`} aria-hidden="true">
      <circle className="progress-ring-track" cx={center} cy={center} r={radius} />
      <circle
        className="progress-ring-fill"
        cx={center}
        cy={center}
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - filled)}
      />
    </svg>
  );
};
