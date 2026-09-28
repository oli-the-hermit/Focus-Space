import React from 'react';
import { useApp } from '../../context/AppContext';
import { useMiniPlayer } from '../../mini/MiniPlayerProvider';
import { strings } from '../../constants/strings';
import { getTodayStr } from '../../lib/dateUtils';
import type { MenuItem } from '../ui/Menu';
import type { TabType } from '../../types';
import {
  IconCalendar,
  IconGift,
  IconHelp,
  IconList,
  IconMiniPlayer,
  IconPause,
  IconPlay,
  IconPlus,
  IconTarget,
  IconTimer
} from '../ui/icons';
import { shortcutHint } from '../../constants/shortcuts';

type Creator = 'session' | 'list' | 'task' | 'schedule' | 'goal' | 'reward';

/** Which "new …" action belongs to each page; it's listed first there. */
const PRIMARY: Record<TabType, Creator> = {
  timer: 'session',
  tasks: 'task',
  calendar: 'schedule',
  stats: 'session',
  goals: 'goal',
  rewards: 'reward'
};

/**
 * Items for a right-click on empty space: create anything, control the timer,
 * open help. Components with their own menu handle the event first.
 */
export function useGlobalMenuItems(): () => (MenuItem | false)[] {
  const { state, activeTab, openModal, toggleTimer, setHelpOpen } = useApp();
  const mini = useMiniPlayer();

  return () => {
    const cm = strings.actions;
    const creators: Record<Creator, MenuItem | false> = {
      session: { key: 'session', label: cm.newSession, icon: <IconTimer size={16} />, hint: shortcutHint('newSession'), onSelect: () => openModal('NEW_SESSION') },
      list: { key: 'list', label: cm.newList, icon: <IconList size={16} />, onSelect: () => openModal('NEW_LIST') },
      task: !!state.activeListId && {
        key: 'task',
        label: cm.newTask,
        icon: <IconPlus size={16} />,
        onSelect: () => openModal('NEW_TASK', { listId: state.activeListId! })
      },
      schedule: {
        key: 'schedule',
        label: cm.scheduleSession,
        icon: <IconCalendar size={16} />,
        onSelect: () => openModal('SCHEDULE_EVENT', { date: getTodayStr() })
      },
      goal: { key: 'goal', label: cm.newGoal, icon: <IconTarget size={16} />, onSelect: () => openModal('NEW_GOAL') },
      reward: { key: 'reward', label: cm.newReward, icon: <IconGift size={16} />, onSelect: () => openModal('NEW_REWARD') }
    };
    const primary = PRIMARY[activeTab];
    const order: Creator[] = [primary, ...(['session', 'list', 'task', 'schedule', 'goal', 'reward'] as Creator[]).filter(c => c !== primary)];
    const running = state.timer.status === 'running';

    return [
      ...order.map(c => creators[c]),
      { key: 'd1', divider: true },
      {
        key: 'timer',
        label: running ? cm.pauseTimer : cm.startTimer,
        icon: running ? <IconPause size={15} /> : <IconPlay size={15} />,
        hint: shortcutHint('toggleTimer'),
        onSelect: toggleTimer
      },
      mini.supported && {
        key: 'mini',
        label: mini.isOpen ? cm.closeMini : cm.openMini,
        icon: <IconMiniPlayer size={16} />,
        hint: shortcutHint('miniPlayer'),
        onSelect: mini.toggle
      },
      { key: 'd2', divider: true },
      { key: 'help', label: cm.help, icon: <IconHelp size={16} />, hint: shortcutHint('help'), onSelect: () => setHelpOpen(true) }
    ];
  };
}
