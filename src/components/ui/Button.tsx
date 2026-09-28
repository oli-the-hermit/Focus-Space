import React, { forwardRef } from 'react';
import { cx } from '../../lib/cx';

export type ButtonVariant = 'secondary' | 'primary' | 'tonal' | 'danger';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** `secondary` (default) is the neutral tonal button. */
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  /** Leading icon. */
  icon?: React.ReactNode;
}

/** Pill-shaped action button (styles: components/button.css). Defaults to type="button". */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', icon, className, type = 'button', children, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cx('btn-action', variant !== 'secondary' && variant, size === 'sm' && 'sm', className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
