import { StatusDot } from '../components/ui/StatusDot';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';

import { BrandHeader } from '../components/header/BrandHeader';
import { NavigationTabs } from '../components/header/NavigationTabs';

import { TimerRing } from '../components/timer/TimerRing';
import { TimerControls } from '../components/timer/TimerControls';
import { TimerCard } from '../components/timer/TimerCard';

import { TaskItem } from '../components/tasks/TaskItem';
import { TaskListCard } from '../components/tasks/TaskListCard';
import { ListSidebar } from '../components/tasks/ListSidebar';

import { SessionItem } from '../components/sessions/SessionItem';
import { SessionsList } from '../components/sessions/SessionsList';

import { AgendaBanner } from '../components/agenda/AgendaBanner';
import { AgendaHeroCard } from '../components/agenda/AgendaHeroCard';
import { AgendaTimeline } from '../components/agenda/AgendaTimeline';

import { CalendarTopbar } from '../components/calendar/CalendarTopbar';
import { CalendarGrid } from '../components/calendar/CalendarGrid';

import { ProductivityChart } from '../components/stats/ProductivityChart';
import { CompletionLogs } from '../components/stats/CompletionLogs';

import { GoalCard } from '../components/goals/GoalCard';
import { GoalsGrid } from '../components/goals/GoalsGrid';

import { RewardCard } from '../components/rewards/RewardCard';
import { RewardsStats } from '../components/rewards/RewardsStats';
import { CelebrationOverlay } from '../components/rewards/CelebrationOverlay';

/**
 * Plasmic Code Component Registration Interface
 * Registers the entire Focus Space component suite for drag-and-drop visual building.
 */
export interface PlasmicRegistry {
  registerComponent: (component: any, meta: any) => void;
}

export function registerAllPlasmicComponents(plasmic: PlasmicRegistry) {
  // UI Primitives
  plasmic.registerComponent(StatusDot, {
    name: 'StatusDot',
    displayName: 'Status Dot',
    category: 'Focus Space UI',
    props: {
      status: {
        type: 'choice',
        options: ['idle', 'running', 'paused', 'break'],
        defaultValue: 'idle'
      },
      label: {
        type: 'string',
        defaultValue: 'Ready'
      }
    }
  });

  plasmic.registerComponent(ProgressBar, {
    name: 'ProgressBar',
    displayName: 'Progress Bar',
    category: 'Focus Space UI',
    props: {
      label: { type: 'string', defaultValue: 'Session Progress' },
      percentage: { type: 'number', defaultValue: 45 },
      color: { type: 'string', defaultValue: '#38BDF8' }
    }
  });

  plasmic.registerComponent(Badge, {
    name: 'Badge',
    displayName: 'Pill Badge',
    category: 'Focus Space UI',
    props: {
      children: { type: 'slot', defaultValue: 'Badge' },
      variant: {
        type: 'choice',
        options: ['primary', 'success', 'warning', 'danger', 'muted'],
        defaultValue: 'primary'
      }
    }
  });

  plasmic.registerComponent(Button, {
    name: 'Button',
    displayName: 'Action Button',
    category: 'Focus Space UI',
    props: {
      children: { type: 'slot', defaultValue: 'Click Me' },
      variant: {
        type: 'choice',
        options: ['primary', 'secondary', 'danger', 'icon'],
        defaultValue: 'primary'
      },
      size: {
        type: 'choice',
        options: ['sm', 'md', 'lg'],
        defaultValue: 'md'
      }
    }
  });

  plasmic.registerComponent(StatCard, {
    name: 'StatCard',
    displayName: 'Stat Metric Card',
    category: 'Focus Space UI',
    props: {
      icon: { type: 'string', defaultValue: '⏱️' },
      value: { type: 'string', defaultValue: '4.2' },
      label: { type: 'string', defaultValue: 'Avg Sessions / Day' }
    }
  });

  // Header & Navigation
  plasmic.registerComponent(BrandHeader, {
    name: 'BrandHeader',
    displayName: 'App Brand Header',
    category: 'Focus Space Layout',
    props: {}
  });

  plasmic.registerComponent(NavigationTabs, {
    name: 'NavigationTabs',
    displayName: 'Navigation Tabs',
    category: 'Focus Space Layout',
    props: {}
  });

  // Timer & Focus
  plasmic.registerComponent(TimerRing, {
    name: 'TimerRing',
    displayName: 'Timer Circular Ring',
    category: 'Focus Space Timer',
    props: {
      remainingSec: { type: 'number', defaultValue: 1500 },
      totalSec: { type: 'number', defaultValue: 1500 },
      sessionName: { type: 'string', defaultValue: 'Deep Work' },
      phase: { type: 'choice', options: ['focus', 'break'], defaultValue: 'focus' }
    }
  });

  plasmic.registerComponent(TimerControls, {
    name: 'TimerControls',
    displayName: 'Timer Action Controls',
    category: 'Focus Space Timer',
    props: {
      status: { type: 'choice', options: ['idle', 'running', 'paused'], defaultValue: 'idle' }
    }
  });

  plasmic.registerComponent(TimerCard, {
    name: 'TimerCard',
    displayName: 'Timer Main Card',
    category: 'Focus Space Timer',
    props: {}
  });

  // Tasks
  plasmic.registerComponent(TaskListCard, {
    name: 'TaskListCard',
    displayName: 'Task List Container',
    category: 'Focus Space Tasks',
    props: {
      compact: { type: 'boolean', defaultValue: false }
    }
  });

  plasmic.registerComponent(ListSidebar, {
    name: 'ListSidebar',
    displayName: 'Task List Sidebar',
    category: 'Focus Space Tasks',
    props: {}
  });

  // Sessions
  plasmic.registerComponent(SessionsList, {
    name: 'SessionsList',
    displayName: 'Sessions Config Panel',
    category: 'Focus Space Timer',
    props: {}
  });

  // Agenda
  plasmic.registerComponent(AgendaBanner, {
    name: 'AgendaBanner',
    displayName: 'Agenda Date Banner',
    category: 'Focus Space Agenda',
    props: {}
  });

  plasmic.registerComponent(AgendaHeroCard, {
    name: 'AgendaHeroCard',
    displayName: 'Agenda Hero Card',
    category: 'Focus Space Agenda',
    props: {}
  });

  plasmic.registerComponent(AgendaTimeline, {
    name: 'AgendaTimeline',
    displayName: 'Agenda Schedule Timeline',
    category: 'Focus Space Agenda',
    props: {}
  });

  // Calendar
  plasmic.registerComponent(CalendarTopbar, {
    name: 'CalendarTopbar',
    displayName: 'Calendar Control Topbar',
    category: 'Focus Space Calendar',
    props: {}
  });

  plasmic.registerComponent(CalendarGrid, {
    name: 'CalendarGrid',
    displayName: 'Calendar Days Grid',
    category: 'Focus Space Calendar',
    props: {}
  });

  // Stats
  plasmic.registerComponent(ProductivityChart, {
    name: 'ProductivityChart',
    displayName: 'Productivity Days Chart',
    category: 'Focus Space Stats',
    props: {}
  });

  plasmic.registerComponent(CompletionLogs, {
    name: 'CompletionLogs',
    displayName: 'Task Completion Activity Log',
    category: 'Focus Space Stats',
    props: {}
  });

  // Goals
  plasmic.registerComponent(GoalsGrid, {
    name: 'GoalsGrid',
    displayName: 'Goals & Landmarks Grid',
    category: 'Focus Space Goals',
    props: {}
  });

  // Rewards
  plasmic.registerComponent(RewardsStats, {
    name: 'RewardsStats',
    displayName: 'Rewards Summary Banner',
    category: 'Focus Space Rewards',
    props: {}
  });

  plasmic.registerComponent(CelebrationOverlay, {
    name: 'CelebrationOverlay',
    displayName: 'Celebration Confetti Overlay',
    category: 'Focus Space Rewards',
    props: {}
  });
}
