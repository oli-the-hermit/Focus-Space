import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TabType } from '../../types';
import { strings } from '../../constants/strings';
import { UserBadge } from '../auth/UserBadge';
import { UserMenuModal, type UserMenuView } from '../auth/UserMenuModal';
import { IconCalendar, IconGift, IconLogo, IconStats, IconTarget, IconTasks, IconTimer } from '../ui/icons';
import { NavigationRail, type NavigationItem } from '../ui/NavigationRail';
import { isTauri } from '../../lib/desktop';
import { storage } from '../../lib/storage';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/** The expanded drawer needs room; below this the rail is used (tokens.css: lg). */
const EXPANDABLE_QUERY = '(min-width: 1024px)';

const NAV_ITEMS: { tab: TabType; label: string; icon: React.ReactNode }[] = [
  { tab: 'timer', label: strings.rail.timer, icon: <IconTimer size={22} /> },
  { tab: 'tasks', label: strings.rail.tasks, icon: <IconTasks size={21} /> },
  { tab: 'calendar', label: strings.rail.calendar, icon: <IconCalendar size={21} /> },
  { tab: 'stats', label: strings.rail.stats, icon: <IconStats size={22} /> },
  { tab: 'goals', label: strings.rail.goals, icon: <IconTarget size={21} /> },
  { tab: 'rewards', label: strings.rail.rewards, icon: <IconGift size={21} /> }
];

/**
 * The app's navigation: its pages, the rewards count, the account at the bottom. A rail
 * or, on wide windows, an expanded drawer; the choice is remembered per device.
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

  const items: NavigationItem[] = NAV_ITEMS.map(item => ({
    key: item.tab,
    label: item.label,
    icon: item.icon,
    ...(item.tab === 'rewards' && {
      badge: readyRewardsCount,
      badgeLabel: `${readyRewardsCount} ${strings.rewards.readyToClaim}`
    })
  }));

  return (
    <NavigationRail
      ariaLabel={strings.rail.navLabel}
      data-tour="nav"
      items={items}
      activeKey={activeTab}
      onSelect={key => setActiveTab(key as TabType)}
      variant={expanded ? 'expanded' : 'rail'}
      brand={{
        mark: <IconLogo size={22} />,
        name: strings.app.title,
        // Tauri only honours the attribute on the element actually pressed.
        attrs: isTauri() ? { 'data-tauri-drag-region': true } : undefined
      }}
      toggle={canExpand ? { expandLabel: strings.rail.expand, collapseLabel: strings.rail.collapse, onToggle: toggleDrawer } : undefined}
      footer={<UserBadge compact={!expanded} onOpen={setMenuView} />}
    >
      <UserMenuModal view={menuView} onClose={() => setMenuView(null)} />
    </NavigationRail>
  );
};
