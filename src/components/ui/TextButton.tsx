import React, { forwardRef } from 'react';
import { cx } from '../../lib/cx';
import { surfaceClass, type Surface } from './surface';

export interface TextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accent-colored text instead of the neutral secondary text. */
  accent?: boolean;
  /** `xs` for a tiny link inside dense grids. */
  size?: 'md' | 'xs';
  /** The surface it sits on; its hover is one step above. */
  surface?: Surface;
}

/** Low-emphasis text button (styles: components/button.css). Defaults to type="button". */
export const TextButton = forwardRef<HTMLButtonElement, TextButtonProps>(
  ({ accent = false, size = 'md', surface, className, type = 'button', children, ...rest }, ref) => (
    <button ref={ref} type={type} className={cx('btn-text', accent && 'accent', size === 'xs' && 'xs', surfaceClass(surface), className)} {...rest}>
      {children}
    </button>
  )
);
TextButton.displayName = 'TextButton';
