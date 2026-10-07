import React, { forwardRef } from 'react';
import { cx } from '../../lib/cx';

export interface PlayerControlProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'aria-pressed'> {
  /** Screen-reader name. */
  label: string;
  /** `primary` is the big play/pause in the phase color; `secondary` a filled round button;
   *  `ghost` a quiet toggle. */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** `sm` for the mini player; its window sets --player-ctrl-sm / --player-ctrl-sm-primary to resize. */
  size?: 'md' | 'sm';
  /** A toggle that's on: aria-pressed, and the phase color for a ghost. */
  pressed?: boolean;
}

/**
 * A round media transport button (play/pause, reset, skip, toggles): the base for the
 * player controls (styles: components/player-control.css). Defaults to type="button";
 * the tooltip defaults to the label.
 */
export const PlayerControl = forwardRef<HTMLButtonElement, PlayerControlProps>(
  ({ label, variant = 'secondary', size = 'md', pressed, className, title, type = 'button', children, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cx(
        'player-ctrl',
        variant !== 'secondary' && `player-ctrl--${variant}`,
        size === 'sm' && 'player-ctrl--sm',
        pressed && 'is-on',
        className
      )}
      aria-label={label}
      aria-pressed={pressed}
      title={title ?? label}
      {...rest}
    >
      {children}
    </button>
  )
);
PlayerControl.displayName = 'PlayerControl';
