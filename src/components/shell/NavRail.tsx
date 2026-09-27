import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TabType } from '../../types';
import { strings } from '../../constants/strings';
import { UserBadge } from '../auth/UserBadge';
import { UserMenuModal } from '../auth/UserMenuModal';
import { IconCalendar, IconGift, IconStats, IconTarget, IconTasks, IconTimer } from '../ui/icons';
import { isTauri } from '../../lib/desktop';

const NAV_ITEMS: { tab: TabType; label: string; icon: React.ReactNode }[] = [
  { tab: 'timer', label: strings.rail.timer, icon: <IconTimer size={22} /> },
  { tab: 'tasks', label: strings.rail.tasks, icon: <IconTasks size={21} /> },
  { tab: 'calendar', label: strings.rail.calendar, icon: <IconCalendar size={21} /> },
  { tab: 'stats', label: strings.rail.stats, icon: <IconStats size={22} /> },
  { tab: 'goals', label: strings.rail.goals, icon: <IconTarget size={21} /> },
  { tab: 'rewards', label: strings.rail.rewards, icon: <IconGift size={21} /> }
];

/** Material 3 navigation rail: brand mark, destinations, account at the bottom. */
export const NavRail: React.FC = () => {
  const { activeTab, setActiveTab, state } = useApp();
  const [menuView, setMenuView] = useState<'profile' | 'settings' | null>(null);
  const readyRewardsCount = state.rewards.filter(r => r.status === 'ready').length;

  return (
    <nav className="nav-rail" aria-label={strings.rail.navLabel} data-tour="nav">
      <div className="nav-rail-brand" title={strings.app.title} {...(isTauri() ? { 'data-tauri-drag-region': true } : {})}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15.5 14" />
        </svg>
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
        <UserBadge
          compact
          onOpenProfile={() => setMenuView('profile')}
          onOpenSettings={() => setMenuView('settings')}
        />
      </div>

      <UserMenuModal view={menuView} onClose={() => setMenuView(null)} />
    </nav>
  );
};
