import React from 'react';

export interface IconSwapProps {
  on: boolean;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  className?: string;
}

/**
 * Two stacked icons that cross-fade (with a small turn and scale) when `on`
 * flips, instead of snapping. Used for play/pause and sound on/off.
 */
export const IconSwap: React.FC<IconSwapProps> = ({ on, onIcon, offIcon, className = '' }) => (
  <span className={`icon-swap ${on ? 'is-on' : 'is-off'} ${className}`} aria-hidden="true">
    <span className="icon-swap-on">{onIcon}</span>
    <span className="icon-swap-off">{offIcon}</span>
  </span>
);
