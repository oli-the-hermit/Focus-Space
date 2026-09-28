import React from 'react';
import { cx } from '../../lib/cx';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `sm` for empty lists inside panels. */
  size?: 'md' | 'sm';
}

/** Centered, muted message shown when a list or view has nothing to show (styles: components/empty-state.css). */
export const EmptyState: React.FC<EmptyStateProps> = ({ size = 'md', className, ...rest }) => (
  <div className={cx('empty-state', size === 'sm' && 'small', className)} {...rest} />
);
