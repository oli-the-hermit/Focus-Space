import React from 'react';
import { cx } from '../../lib/cx';
import { IconSidebar } from './icons';

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
  /** The brand mark at the top; its name shows as an overline when expanded. */
  brand: { mark: React.ReactNode; name: string; attrs?: Record<string, unknown> };
  /**
   * Makes the brand mark the expand/collapse button: it shows the mark in the rail and a
   * side-panel icon when expanded. Without it the mark is only a logo.
   */
  toggle?: { expandLabel: string; collapseLabel: string; onToggle: () => void };
  /** Pinned to the bottom, e.g. the account. */
  footer?: React.ReactNode;
  'data-tour'?: string;
  /** Rendered after the rail, e.g. dialogs opened from it. */
  children?: React.ReactNode;
}

/**
 * Material 3 navigation rail / drawer (styles: components/nav-rail.css). The items sit
 * centered between the brand and the footer; each carries data-tab={key}. The active pill is its own element, named for a view
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
      {/* Expanded: the name as an overline at the start, the mark at the end (like a card's head). */}
      <div className="nav-rail-head">
        {expanded && <span className="overline nav-rail-brand-name" aria-hidden="true" {...brand.attrs}>{brand.name}</span>}
        {toggle ? (
          <button
            type="button"
            className="nav-rail-brand is-toggle"
            aria-label={expanded ? toggle.collapseLabel : toggle.expandLabel}
            title={expanded ? toggle.collapseLabel : toggle.expandLabel}
            aria-expanded={expanded}
            onClick={toggle.onToggle}
          >
            {expanded ? <IconSidebar size={16} /> : brand.mark}
          </button>
        ) : (
          <div className="nav-rail-brand" title={brand.name} {...brand.attrs}>
            {brand.mark}
          </div>
        )}
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

      <div className="nav-rail-footer">{footer}</div>

      {children}
    </nav>
  );
};
