import React from 'react';
import { cx } from '../../lib/cx';

/** Columns (of 12) per breakpoint; a missing breakpoint keeps the one below it. */
export interface GridSpan {
  base?: number;
  md?: number;
  lg?: number;
  xl?: number;
  '2xl'?: number;
  '3xl'?: number;
}

const SPAN_VARS: Record<keyof GridSpan, string> = {
  base: '--span',
  md: '--span-md',
  lg: '--span-lg',
  xl: '--span-xl',
  '2xl': '--span-2xl',
  '3xl': '--span-3xl'
};

export interface LayoutGridProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
}

/** The 12-column page grid, with the app's gutters (styles: components/layout-grid.css). */
export const LayoutGrid: React.FC<LayoutGridProps> = ({ id, className, children }) => (
  <div id={id} className={cx('layout-grid', className)}>{children}</div>
);

export interface GridItemProps {
  /** Columns to span; defaults to the full width. */
  span?: GridSpan;
  /** Rows to span, for tiles sized in rows (bento); otherwise as tall as the content. */
  rows?: number;
  className?: string;
  children: React.ReactNode;
}

/** One cell of a LayoutGrid. */
export const GridItem: React.FC<GridItemProps> = ({ span = {}, rows, className, children }) => {
  const style: Record<string, number> = {};
  for (const [bp, cols] of Object.entries(span) as [keyof GridSpan, number | undefined][]) {
    if (cols) style[SPAN_VARS[bp]] = cols;
  }
  if (rows) style['--rows'] = rows;
  return (
    <div className={cx('grid-item', !!rows && 'grid-item--rows', className)} style={style as React.CSSProperties}>
      {children}
    </div>
  );
};
