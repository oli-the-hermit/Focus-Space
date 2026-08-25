import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserBadge } from '../auth/UserBadge';
import { UserMenuModal } from '../auth/UserMenuModal';
import { strings } from '../../constants/strings';

export interface BrandHeaderProps {
  onOpenNotifications?: () => void;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ onOpenNotifications }) => {
  const { state, toggleSound } = useApp();
  const [menuView, setMenuView] = useState<'profile' | 'settings' | null>(null);

  const isBreak = state.timer.phase === 'break';
  const isRunning = state.timer.status === 'running';
  const isPaused = state.timer.status === 'paused';

  let statusDotClass = 'status-dot idle';
  let statusText: string = strings.status.ready;

  if (isRunning) {
    statusDotClass = `status-dot ${isBreak ? 'break' : 'running'}`;
    statusText = isBreak ? strings.status.onBreak : strings.status.focusing;
  } else if (isPaused) {
    statusDotClass = 'status-dot paused';
    statusText = strings.status.paused;
  } else {
    statusDotClass = 'status-dot idle';
    statusText = strings.status.ready;
  }

  return (
    <header className="app-header">
      <div className="header-brand">
        <svg
          className="brand-icon"
          width="20"
          height="20"
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
        <span className="brand-name">{strings.app.title}</span>
      </div>

      <div className="header-status" id="headerStatus">
        <span className={statusDotClass} id="statusDot" />
        <span id="statusText">{statusText}</span>
      </div>

      <div className="header-tools">
        {onOpenNotifications && (
          <button
            className="tool-btn"
            id="notifSettingsBtn"
            title={strings.header.notifTooltip}
            onClick={onOpenNotifications}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        )}

        <button
          className="tool-btn"
          id="soundToggleBtn"
          title={strings.header.soundToggleTooltip}
          onClick={toggleSound}
        >
          {state.sound ? (
            <svg id="iconSoundOn" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            <svg id="iconSoundOff" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>

        <UserBadge
          onOpenProfile={() => setMenuView('profile')}
          onOpenSettings={() => setMenuView('settings')}
        />
      </div>

      {menuView && (
        <UserMenuModal view={menuView} onClose={() => setMenuView(null)} />
      )}
    </header>
  );
};
