import React, { forwardRef } from 'react';
import { cx } from '../../lib/cx';

export interface WindowButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'aria-pressed'> {
  /** Screen-reader name; also the tooltip unless `title` is given. */
  label: string;
  /** `md` for the desktop title bar, `sm` for the mini player's window. */
  size?: 'md' | 'sm';
  /** The close button: fills red on hover (md). */
  danger?: boolean;
  /** A window toggle that's on (pin, always on top). */
  pressed?: boolean;
}

/** A window chrome button: minimize, maximize, close, pin (styles: components/window-button.css). */
export const WindowButton = forwardRef<HTMLButtonElement, WindowButtonProps>(
  ({ label, size = 'md', danger = false, pressed, className, title, type = 'button', children, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cx('window-btn', size === 'sm' && 'window-btn--sm', danger && 'is-close', pressed && 'is-on', className)}
      aria-label={label}
      aria-pressed={pressed}
      title={title ?? label}
      {...rest}
    >
      {children}
    </button>
  )
);
WindowButton.displayName = 'WindowButton';
