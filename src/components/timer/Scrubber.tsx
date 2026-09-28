import React from 'react';

export interface ScrubberProps {
  /** 0–100 */
  value: number;
  label: string;
  /** The round handle at the current position (full player only). */
  knob?: boolean;
}

/** Phase progress track shared by the player card and the mini player (styles: features/timer.css). */
export const Scrubber: React.FC<ScrubberProps> = ({ value, label, knob = false }) => (
  <div
    className="scrubber-track"
    role="progressbar"
    aria-label={label}
    aria-valuenow={Math.round(value)}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div className="scrubber-fill" style={{ width: `${value}%` }} />
    {knob && <div className="scrubber-knob" style={{ left: `${value}%` }} />}
  </div>
);
