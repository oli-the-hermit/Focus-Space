import React from 'react';
import { cx } from '../../lib/cx';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** `accent` uses the accent container colors. */
  tone?: 'default' | 'accent';
}

/** Small read-only label, e.g. "3 tasks remaining" (styles: components/chip.css). */
export const Chip: React.FC<ChipProps> = ({ tone = 'default', className, ...rest }) => (
  <span className={cx('chip', tone === 'accent' && 'chip--accent', className)} {...rest} />
);
