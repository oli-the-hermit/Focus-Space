import React from 'react';
import { cx } from '../../lib/cx';

export interface CollapsibleProps {
  open: boolean;
  className?: string;
  children: React.ReactNode;
}

/** `inert` keeps the hidden content out of the tab order (React 18 has no typed prop). */
const inertUnless = (open: boolean) => (open ? {} : ({ inert: '' } as Record<string, string>));

/**
 * Content that folds open and closed, animating its height (styles:
 * components/collapsible.css). Closed content stays mounted but can't be reached.
 */
export const Collapsible: React.FC<CollapsibleProps> = ({ open, className, children }) => (
  <div className={cx('collapsible', className)} data-open={open}>
    <div className="collapsible-inner" {...inertUnless(open)}>
      {children}
    </div>
  </div>
);
