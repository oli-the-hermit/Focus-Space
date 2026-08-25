import React from 'react';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';

export const NavigationTabs: React.FC = () => {
  const { activeTab, setActiveTab, state } = useApp();

  const readyRewardsCount = state.rewards.filter(r => r.status === 'ready').length;

  return (
    <nav className="app-nav">
      <button
        className={`nav-tab ${activeTab === 'timer' ? 'active' : ''}`}
        data-tab="timer"
        onClick={() => setActiveTab('timer')}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {strings.tabs.timer}
      </button>

      <button
        className={`nav-tab ${activeTab === 'tasks' ? 'active' : ''}`}
        data-tab="tasks"
        onClick={() => setActiveTab('tasks')}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        {strings.tabs.tasks}
      </button>

      <button
        className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
        data-tab="calendar"
        onClick={() => setActiveTab('calendar')}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {strings.tabs.calendar}
      </button>

      <button
        className={`nav-tab ${activeTab === 'stats' ? 'active' : ''}`}
        data-tab="stats"
        onClick={() => setActiveTab('stats')}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        {strings.tabs.stats}
      </button>

      <button
        className={`nav-tab ${activeTab === 'goals' ? 'active' : ''}`}
        data-tab="goals"
        onClick={() => setActiveTab('goals')}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
        {strings.tabs.goals}
      </button>

      <button
        className={`nav-tab ${activeTab === 'rewards' ? 'active' : ''}`}
        data-tab="rewards"
        onClick={() => setActiveTab('rewards')}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
        {strings.tabs.rewards}
        {readyRewardsCount > 0 ? (
          <span className="nav-badge" id="rewardBadge">{readyRewardsCount}</span>
        ) : (
          <span className="nav-badge hidden" id="rewardBadge">0</span>
        )}
      </button>
    </nav>
  );
};
