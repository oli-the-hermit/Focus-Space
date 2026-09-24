import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { NavRail } from './components/shell/NavRail';
import { TopBar } from './components/shell/TopBar';

import { PlayerCard } from './components/timer/PlayerCard';
import { TaskListCard } from './components/tasks/TaskListCard';
import { SessionTaskLists } from './components/tasks/SessionTaskLists';
import { ListSidebar } from './components/tasks/ListSidebar';
import { SessionsList } from './components/sessions/SessionsList';

import { CalendarTopbar } from './components/calendar/CalendarTopbar';
import { CalendarGrid } from './components/calendar/CalendarGrid';

import { StatCard } from './components/ui/StatCard';
import { ProductivityChart } from './components/stats/ProductivityChart';
import { CompletionLogs } from './components/stats/CompletionLogs';

import { GoalsGrid } from './components/goals/GoalsGrid';
import { RewardsGrid } from './components/rewards/RewardsGrid';
import { CelebrationOverlay } from './components/rewards/CelebrationOverlay';

import { ModalManager } from './components/modals/ModalManager';
import { NotificationModal } from './components/modals/NotificationModal';
import { TwoColumnLayout } from './components/ui/TwoColumnLayout';
import { LoginScreen } from './components/auth/LoginScreen';
import { MiniPlayerProvider } from './mini/MiniPlayerProvider';
import { strings } from './constants/strings';
import { formatDuration } from './lib/formatUtils';
import { IconCheck, IconClock, IconTimer } from './components/ui/icons';

export const AppContent: React.FC = () => {
  const {
    state,
    activeTab,
    toasts,
    authStatus
  } = useApp();

  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  if (authStatus === 'loading') {
    return (
      <div className="auth-screen">
        <div className="auth-card auth-loading-card">
          <div className="auth-logo auth-loading-logo">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="auth-subtitle auth-loading-subtitle">
            {strings.auth.restoringSession}
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return <LoginScreen />;
  }

  // Stats calculations
  const datesSet = new Set<string>();
  state.sessionLogs.forEach(s => datesSet.add(s.date));
  state.taskCompletionLogs.forEach(t => datesSet.add(t.date));
  const uniqueDaysCount = Math.max(1, datesSet.size);

  const avgSessions = (state.sessionLogs.length / uniqueDaysCount).toFixed(1);
  const totalWorkedMins = state.sessionLogs.reduce((sum, s) => sum + (s.durationMins || 25), 0);
  const avgWorkedSecs = Math.round((totalWorkedMins * 60) / uniqueDaysCount);
  const avgTasks = (state.taskCompletionLogs.length / uniqueDaysCount).toFixed(1);
  const totalTaskDuration = state.taskCompletionLogs.reduce((sum, t) => sum + (t.durationSeconds || 0), 0);
  const avgTaskSec = state.taskCompletionLogs.length > 0 ? Math.round(totalTaskDuration / state.taskCompletionLogs.length) : 0;

  return (
    <MiniPlayerProvider>
      <div className="app-shell">
        <NavRail />

        <div className="app-column">
          <TopBar onOpenNotifications={() => setIsNotifModalOpen(true)} />

          <main className="app-main">
            {/* ── TAB: TIMER & SESSIONS ─────────────────────────── */}
            <section className={`tab-page ${activeTab === 'timer' ? 'active' : ''}`} id="tab-timer">
              <div className="timer-layout">
                <aside className="timer-layout-player"><PlayerCard /></aside>
                <div className="timer-layout-tasks"><SessionTaskLists /></div>
                <aside className="timer-layout-queue"><SessionsList /></aside>
              </div>
            </section>

            {/* ── TAB: TASKS ────────────────────────────────────── */}
            <section className={`tab-page ${activeTab === 'tasks' ? 'active' : ''}`} id="tab-tasks">
              <TwoColumnLayout
                className="tasks-layout-container"
                sidebar={<ListSidebar />}
                content={<TaskListCard />}
              />
            </section>

            {/* ── TAB: CALENDAR ─────────────────────────────────── */}
            <section className={`tab-page tab-page--fill ${activeTab === 'calendar' ? 'active' : ''}`} id="tab-calendar">
              <CalendarTopbar />
              <CalendarGrid />
            </section>

            {/* ── TAB: STATS ────────────────────────────────────── */}
            <section className={`tab-page ${activeTab === 'stats' ? 'active' : ''}`} id="tab-stats">
              <div className="stats-overview-grid">
                <StatCard icon={<IconTimer size={20} />} value={avgSessions} label={strings.stats.avgSessionsDay} />
                <StatCard icon={<IconClock size={20} />} value={formatDuration(avgWorkedSecs)} label={strings.stats.avgWorkedDay} />
                <StatCard icon={<IconCheck size={20} />} value={avgTasks} label={strings.stats.avgTasksCompletedDay} />
                <StatCard icon={<IconClock size={20} />} value={formatDuration(avgTaskSec)} label={strings.stats.avgTimePerTask} accent />
              </div>

              <div className="stats-row">
                <ProductivityChart />
                <CompletionLogs />
              </div>
            </section>

            {/* ── TAB: GOALS & LANDMARKS ────────────────────────── */}
            <section className={`tab-page ${activeTab === 'goals' ? 'active' : ''}`} id="tab-goals">
              <GoalsGrid />
            </section>

            {/* ── TAB: REWARDS ──────────────────────────────────── */}
            <section className={`tab-page ${activeTab === 'rewards' ? 'active' : ''}`} id="tab-rewards">
              <RewardsGrid />
            </section>
          </main>
        </div>

        {/* Celebration & Toast Overlays */}
        <CelebrationOverlay />

        <div className="toast-container" id="toastContainer" role="status" aria-live="polite">
          {toasts.map(t => (
            <div key={t.id} className="toast">
              {t.message}
            </div>
          ))}
        </div>

        {/* Modal Manager for all dynamic modals */}
        <ModalManager />

        {/* Notification Settings Modal */}
        <NotificationModal
          isOpen={isNotifModalOpen}
          onClose={() => setIsNotifModalOpen(false)}
        />
      </div>
    </MiniPlayerProvider>
  );
};
