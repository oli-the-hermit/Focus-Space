import React from 'react';
import { cx } from '../../lib/cx';
import { IconChevronRight, IconExternal } from './icons';

export interface ListRowProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** Opens something outside the app: an external-link mark instead of the chevron. */
  external?: boolean;
  onClick: () => void;
  className?: string;
}

/** A tappable row in a list of destinations: icon, title, description, chevron (styles: components/list-row.css). */
export const ListRow: React.FC<ListRowProps> = ({ icon, title, description, external = false, onClick, className }) => (
  <button type="button" className={cx('list-row', className)} onClick={onClick}>
    <span className="list-row-icon">{icon}</span>
    <span className="list-row-text">
      <span className="list-row-title">{title}</span>
      {description && <span className="list-row-desc">{description}</span>}
    </span>
    <span className="list-row-trail">{external ? <IconExternal size={16} /> : <IconChevronRight size={18} />}</span>
  </button>
);
