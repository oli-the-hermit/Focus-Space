import React from 'react';
import { cx } from '../../lib/cx';
import { IconButton } from './IconButton';
import { IconChevronLeft, IconChevronRight } from './icons';

export interface NavigationItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** A count shown on the icon (e.g. rewards ready); hidden at 0. */
  badge?: number;
  /** Screen-reader text for the badge, e.g. "2 ready to claim". */
  badgeLabel?: string;
}

export interface NavigationRailProps {
  ariaLabel: string;
  items: NavigationItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  /** `rail`: icons over small labels. `expanded`: labels beside the icons. */
  variant?: 'rail' | 'expanded';
  /** The brand mark at the top; its name shows beside it when expanded. */
  brand: { mark: React.ReactNode; name: string; attrs?: Record<string, unknown> };
  /** Shows the expand/collapse button above the footer. */
  toggle?: { expandLabel: string; collapseLabel: string; onToggle: () => void };
  /** Pinned to the bottom, e.g. the account. */
  footer?: React.ReactNode;
  'data-tour'?: string;
  /** Rendered after the rail, e.g. dialogs opened from it. */
  children?: React.ReactNode;
}

/**
 * Material 3 navigation rail / drawer (styles: components/nav-rail.css). Each item
 * carries data-tab={key}. The active pill is its own element, named for a view
 * transition, so page changes can slide it between items.
 */
export const NavigationRail: React.FC<NavigationRailProps> = ({
  ariaLabel,
  items,
  activeKey,
  onSelect,
  variant = 'rail',
  brand,
  toggle,
  footer,
  'data-tour': dataTour,
  children
}) => {
  const expanded = variant === 'expanded';
  return (
    <nav className="nav-rail" data-variant={variant} aria-label={ariaLabel} data-tour={dataTour}>
      <div className="nav-rail-head">
        <div className="nav-rail-brand" title={brand.name} {...brand.attrs}>
          {brand.mark}
        </div>
        {expanded && <span className="nav-rail-brand-name" aria-hidden="true">{brand.name}</span>}
      </div>

      <div className="nav-rail-items">
        {items.map(item => {
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              className={cx('nav-rail-item', isActive && 'active')}
              data-tab={item.key}
              title={expanded ? undefined : item.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelect(item.key)}
            >
              <span className="nav-rail-indicator">
                {isActive && <span className="nav-rail-pill" aria-hidden="true" />}
                {item.icon}
                {!!item.badge && (
                  <span className="nav-badge" aria-label={item.badgeLabel}>
                    {item.badge}
                  </span>
                )}
              </span>
              <span className="nav-rail-label">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="nav-rail-footer">
        {toggle && (
          <IconButton
            label={expanded ? toggle.collapseLabel : toggle.expandLabel}
            className="nav-rail-toggle"
            onClick={toggle.onToggle}
          >
            {expanded ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
          </IconButton>
        )}
        {footer}
      </div>

      {children}
    </nav>
  );
};
