import React, { forwardRef } from 'react';
import { cx } from '../../lib/cx';

export type ButtonVariant = 'secondary' | 'primary' | 'tonal' | 'danger';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** `secondary` (default) is the neutral tonal button. */
  variant?: ButtonVariant;
  /** `xs` is for compact cards: taller than a chip, smaller than a title. */
  size?: 'md' | 'sm' | 'xs';
  /** Leading icon. */
  icon?: React.ReactNode;
  /**
   * On phones, show only the icon. Give it an `aria-label` and a `title` that say the
   * whole action, since the text is hidden there.
   */
  collapsible?: boolean;
}

/** Pill-shaped action button (styles: components/button.css). Defaults to type="button". */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', icon, collapsible = false, className, type = 'button', children, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cx('btn-action', variant !== 'secondary' && variant, size !== 'md' && size, collapsible && 'is-collapsible', className)}
      {...rest}
    >
      {icon}
      {collapsible ? <span className="btn-label">{children}</span> : children}
    </button>
  )
);
Button.displayName = 'Button';
