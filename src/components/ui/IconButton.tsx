import React, { forwardRef } from 'react';
import { cx } from '../../lib/cx';

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Accessible name, also shown as the tooltip. Required: the button has no visible text. */
  label: string;
  size?: 'md' | 'sm' | 'xs';
  tone?: 'default' | 'danger';
  /** Toggled-on state (accent container). */
  active?: boolean;
  children: React.ReactNode;
}

/** Round icon-only button (styles: components/button.css). Defaults to type="button". */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size = 'md', tone = 'default', active = false, className, type = 'button', title, children, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cx('icon-btn', size !== 'md' && size, tone === 'danger' && 'danger', active && 'is-active', className)}
      aria-label={label}
      title={title ?? label}
      {...rest}
    >
      {children}
    </button>
  )
);
IconButton.displayName = 'IconButton';
