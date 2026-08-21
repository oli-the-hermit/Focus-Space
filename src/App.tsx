import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { BrandHeader } from './components/header/BrandHeader';
import { NavigationTabs } from './components/header/NavigationTabs';

import { TimerCard } from './components/timer/TimerCard';
import { TaskListCard } from './components/tasks/TaskListCard';
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
import { Modal } from './components/ui/Modal';
import { TwoColumnLayout } from './components/ui/TwoColumnLayout';
import { LoginScreen } from './components/auth/LoginScreen';
import { strings } from './constants/strings';

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

export const AppContent: React.FC = () => {
  const {
    state,
    activeTab,
    toasts,
    updateNotifications,
    authStatus
  } = useApp();

  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  if (authStatus === 'loading') {
    return (
      <div className="auth-screen">
        <div className="auth-card" style={{ padding: '48px 32px' }}>
          <div className="auth-logo" style={{ animation: 'pulse 1.8s infinite ease-in-out' }}>
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
          <p className="auth-subtitle" style={{ margin: 0 }}>
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
    <div className="app-wrapper">
      <BrandHeader onOpenNotifications={() => setIsNotifModalOpen(true)} />
      <NavigationTabs />

      <main className="app-main">
        {/* ── TAB: TIMER & SESSIONS ─────────────────────────── */}
        <section className={`tab-page ${activeTab === 'timer' ? 'active' : ''}`} id="tab-timer">
          <TwoColumnLayout
            className="timer-layout-container"
            sidebar={<TimerCard />}
            content={<TaskListCard inTimer={true} />}
            secondarySidebar={<SessionsList />}
          />
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
        <section className={`tab-page ${activeTab === 'calendar' ? 'active' : ''}`} id="tab-calendar">
          <CalendarTopbar />
          <CalendarGrid />
        </section>

        {/* ── TAB: STATS ────────────────────────────────────── */}
        <section className={`tab-page ${activeTab === 'stats' ? 'active' : ''}`} id="tab-stats">
          <div className="stats-overview-grid">
            <StatCard icon="⏱️" value={avgSessions} label="Avg Sessions / Day" />
            <StatCard icon="⏳" value={formatDuration(avgWorkedSecs)} label="Avg Worked Time / Day" />
            <StatCard icon="✅" value={avgTasks} label="Avg Tasks Completed / Day" />
            <StatCard icon="⚡" value={formatDuration(avgTaskSec)} label="Avg Time per Task" />
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

      {/* Celebration & Toast Overlays */}
      <CelebrationOverlay />

      <div className="toast-container" id="toastContainer">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            {t.message}
          </div>
        ))}
      </div>

      {/* Modal Manager for all dynamic modals */}
      <ModalManager />

      {/* Notification Settings Modal */}
      <Modal isOpen={isNotifModalOpen} title={strings.notifications.modalTitle} onClose={() => setIsNotifModalOpen(false)}>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={state.notifications.enabled}
              onChange={e => updateNotifications({ enabled: e.target.checked })}
            />
            {strings.notifications.enableLabel}
          </label>
        </div>

        <div className="form-group" style={{ marginTop: '12px' }}>
          <label className="form-label">{strings.notifications.leadTimeLabel}</label>
          <select
            className="form-select"
            value={state.notifications.leadMinutes}
            onChange={e => updateNotifications({ leadMinutes: Number(e.target.value) })}
          >
            <option value={5}>5 minutes before</option>
            <option value={10}>10 minutes before</option>
            <option value={15}>15 minutes before</option>
            <option value={30}>30 minutes before</option>
          </select>
        </div>

        <div className="form-group" style={{ marginTop: '12px' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={state.notifications.sound}
              onChange={e => updateNotifications({ sound: e.target.checked })}
            />
            {strings.notifications.soundLabel}
          </label>
        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button
            className="btn-action primary"
            onClick={() => {
              if ('Notification' in window) {
                Notification.requestPermission();
              }
              setIsNotifModalOpen(false);
            }}
          >
            {strings.notifications.requestPermBtn}
          </button>
        </div>
      </Modal>
    </div>
  );
};
