import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TabType } from '../../types';
import { strings } from '../../constants/strings';
import { UserBadge } from '../auth/UserBadge';
import { UserMenuModal, type UserMenuView } from '../auth/UserMenuModal';
import { IconCalendar, IconChevronLeft, IconChevronRight, IconGift, IconLogo, IconStats, IconTarget, IconTasks, IconTimer } from '../ui/icons';
import { IconButton } from '../ui/IconButton';
import { storage } from '../../lib/storage';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/** The expanded drawer needs room; below this the rail is used (tokens.css: lg). */
const EXPANDABLE_QUERY = '(min-width: 1024px)';
import { isTauri } from '../../lib/desktop';

const NAV_ITEMS: { tab: TabType; label: string; icon: React.ReactNode }[] = [
  { tab: 'timer', label: strings.rail.timer, icon: <IconTimer size={22} /> },
  { tab: 'tasks', label: strings.rail.tasks, icon: <IconTasks size={21} /> },
  { tab: 'calendar', label: strings.rail.calendar, icon: <IconCalendar size={21} /> },
  { tab: 'stats', label: strings.rail.stats, icon: <IconStats size={22} /> },
  { tab: 'goals', label: strings.rail.goals, icon: <IconTarget size={21} /> },
  { tab: 'rewards', label: strings.rail.rewards, icon: <IconGift size={21} /> }
];

/**
 * Material 3 navigation: brand mark, destinations, account at the bottom. A rail (icons
 * over small labels) or, on wide windows, an expanded drawer (labels beside the icons);
 * the choice is remembered per device.
 */
export const NavRail: React.FC = () => {
  const { activeTab, setActiveTab, state } = useApp();
  const [menuView, setMenuView] = useState<UserMenuView | null>(null);
  const readyRewardsCount = state.rewards.filter(r => r.status === 'ready').length;
  const [wantExpanded, setWantExpanded] = useState(() => storage.get('drawer') === 'expanded');
  const canExpand = useMediaQuery(EXPANDABLE_QUERY);
  const expanded = wantExpanded && canExpand;
  const toggleDrawer = () => {
    const next = !wantExpanded;
    setWantExpanded(next);
    storage.set('drawer', next ? 'expanded' : 'rail');
  };

  return (
    <nav className="nav-rail" data-variant={expanded ? 'expanded' : 'rail'} aria-label={strings.rail.navLabel} data-tour="nav">
      <div className="nav-rail-head">
        <div className="nav-rail-brand" title={strings.app.title} {...(isTauri() ? { 'data-tauri-drag-region': true } : {})}>
          <IconLogo size={22} />
        </div>
        {expanded && <span className="nav-rail-brand-name" aria-hidden="true">{strings.app.title}</span>}
      </div>

      <div className="nav-rail-items">
        {NAV_ITEMS.map(item => {
          const isActive = activeTab === item.tab;
          const badge = item.tab === 'rewards' && readyRewardsCount > 0 ? readyRewardsCount : 0;
          return (
            <button
              key={item.tab}
              type="button"
              className={`nav-rail-item ${isActive ? 'active' : ''}`}
              data-tab={item.tab}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveTab(item.tab)}
            >
              <span className="nav-rail-indicator">
                {/* The active pill is its own element so page changes can slide it
                    between items as a shared-element view transition. */}
                {isActive && <span className="nav-rail-pill" aria-hidden="true" />}
                {item.icon}
                {badge > 0 && (
                  <span className="nav-badge" id="rewardBadge" aria-label={`${badge} ${strings.rewards.readyToClaim}`}>
                    {badge}
                  </span>
                )}
              </span>
              <span className="nav-rail-label">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="nav-rail-footer">
        {canExpand && (
          <IconButton
            label={expanded ? strings.rail.collapse : strings.rail.expand}
            className="nav-rail-toggle"
            onClick={toggleDrawer}
          >
            {expanded ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
          </IconButton>
        )}
        <UserBadge compact={!expanded} onOpen={setMenuView} />
      </div>

      <UserMenuModal view={menuView} onClose={() => setMenuView(null)} />
    </nav>
  );
};
