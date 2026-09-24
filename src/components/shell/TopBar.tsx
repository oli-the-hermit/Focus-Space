import React from 'react';
import { useApp } from '../../context/AppContext';
import { useMiniPlayer } from '../../mini/MiniPlayerProvider';
import { strings } from '../../constants/strings';
import { formatClock } from '../../lib/formatUtils';
import { TabType } from '../../types';
import { IconBell, IconMiniPlayer, IconPause, IconPlay, IconSoundOff, IconSoundOn } from '../ui/icons';

const PAGE_TITLES: Record<TabType, string> = {
  timer: strings.tabs.timer,
  agenda: strings.tabs.agenda,
  tasks: strings.tabs.tasks,
  calendar: strings.tabs.calendar,
  stats: strings.tabs.stats,
  goals: strings.tabs.goals,
  rewards: strings.tabs.rewards
};

export interface TopBarProps {
  onOpenNotifications?: () => void;
}

/**
 * Page title, live timer status and global tools. Away from the timer page the
 * status chip also shows the countdown and a play/pause shortcut.
 */
export const TopBar: React.FC<TopBarProps> = ({ onOpenNotifications }) => {
  const { state, activeTab, setActiveTab, toggleSound, toggleTimer } = useApp();
  const mini = useMiniPlayer();

  const isBreak = state.timer.phase === 'break';
  const isRunning = state.timer.status === 'running';
  const isPaused = state.timer.status === 'paused';

  let statusClass = 'idle';
  let statusText: string = strings.status.ready;
  if (isRunning) {
    statusClass = isBreak ? 'break' : 'running';
    statusText = isBreak ? strings.status.onBreak : strings.status.focusing;
  } else if (isPaused) {
    statusClass = 'paused';
    statusText = strings.status.paused;
  }

  const showCountdown = activeTab !== 'timer' && (isRunning || isPaused);

  return (
    <header className="top-bar">
      <h1 className="top-bar-title">{PAGE_TITLES[activeTab]}</h1>

      <div className={`status-chip is-${statusClass}`} id="headerStatus">
        <button
          type="button"
          className="status-chip-main"
          onClick={() => setActiveTab('timer')}
          title={strings.tabs.timer}
        >
          <span className={`status-dot ${statusClass}`} id="statusDot" />
          <span id="statusText">{statusText}</span>
          {showCountdown && <span className="status-chip-time">{formatClock(state.timer.remaining)}</span>}
        </button>
        {showCountdown && (
          <button
            type="button"
            className="status-chip-action"
            onClick={toggleTimer}
            aria-label={isRunning ? strings.timer.pauseTooltip : strings.timer.playTooltip}
            title={isRunning ? strings.timer.pauseTooltip : strings.timer.playTooltip}
          >
            {isRunning ? <IconPause size={14} /> : <IconPlay size={14} />}
          </button>
        )}
      </div>

      <div className="top-bar-tools">
        {mini.supported && (
          <button
            type="button"
            className={`icon-btn ${mini.isOpen ? 'is-active' : ''}`}
            onClick={mini.toggle}
            title={mini.isOpen ? strings.timer.miniPlayerClose : strings.timer.miniPlayerOpen}
            aria-label={mini.isOpen ? strings.timer.miniPlayerClose : strings.timer.miniPlayerOpen}
            aria-pressed={mini.isOpen}
          >
            <IconMiniPlayer size={19} />
          </button>
        )}
        {onOpenNotifications && (
          <button
            type="button"
            className="icon-btn"
            id="notifSettingsBtn"
            title={strings.header.notifTooltip}
            aria-label={strings.header.notifTooltip}
            onClick={onOpenNotifications}
          >
            <IconBell size={19} />
          </button>
        )}
        <button
          type="button"
          className="icon-btn"
          id="soundToggleBtn"
          title={strings.header.soundToggleTooltip}
          aria-label={strings.header.soundToggleTooltip}
          aria-pressed={state.sound}
          onClick={toggleSound}
        >
          {state.sound ? <IconSoundOn size={19} /> : <IconSoundOff size={19} />}
        </button>
      </div>
    </header>
  );
};
