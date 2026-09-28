import React, { forwardRef } from 'react';
import { cx } from '../../lib/cx';

export interface TextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accent-colored text instead of the neutral secondary text. */
  accent?: boolean;
}

/** Low-emphasis text button (styles: components/button.css). Defaults to type="button". */
export const TextButton = forwardRef<HTMLButtonElement, TextButtonProps>(
  ({ accent = false, className, type = 'button', children, ...rest }, ref) => (
    <button ref={ref} type={type} className={cx('btn-text', accent && 'accent', className)} {...rest}>
      {children}
    </button>
  )
);
TextButton.displayName = 'TextButton';
