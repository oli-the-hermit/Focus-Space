import React from 'react';
import { useApp } from '../../context/AppContext';
import { useMiniPlayer } from '../../mini/MiniPlayerProvider';
import { strings } from '../../constants/strings';
import { formatClock } from '../../lib/formatUtils';
import { isTauri } from '../../lib/desktop';
import { TabType } from '../../types';
import { IconBell, IconHelp, IconMiniPlayer, IconPause, IconPlay, IconSoundOff, IconSoundOn } from '../ui/icons';
import { IconSwap } from '../ui/IconSwap';
import { WindowControls } from './WindowControls';
import { IconButton } from '../ui/IconButton';
import { cx } from '../../lib/cx';
import { StatusChip, type StatusTone } from '../ui/StatusChip';

const PAGE_TITLES: Record<TabType, string> = {
  timer: strings.tabs.timer,
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
 * On desktop the bar doubles as the (frameless) window's title bar.
 */
export const TopBar: React.FC<TopBarProps> = ({ onOpenNotifications }) => {
  const { state, activeTab, setActiveTab, toggleSound, toggleTimer, setHelpOpen, alertRinging, bellDot, clearBellDot } = useApp();
  const mini = useMiniPlayer();
  const desktop = isTauri();
  // Tauri only honours the attribute on the element actually pressed.
  const drag = desktop ? { 'data-tauri-drag-region': true } : {};

  const isBreak = state.timer.phase === 'break';
  const isRunning = state.timer.status === 'running';
  const isPaused = state.timer.status === 'paused';

  let statusClass: StatusTone = 'idle';
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
    <header className={`top-bar ${desktop ? 'has-window-controls' : ''}`} {...drag}>
      <h1 className="top-bar-title" {...drag}>{PAGE_TITLES[activeTab]}</h1>

      <StatusChip
        id="headerStatus"
        data-tour="status-chip"
        tone={statusClass}
        label={statusText}
        value={showCountdown ? formatClock(state.timer.remaining) : undefined}
        onOpen={() => setActiveTab('timer')}
        openTitle={strings.tabs.timer}
        action={
          showCountdown
            ? {
                label: isRunning ? strings.timer.pauseTooltip : strings.timer.playTooltip,
                icon: <IconSwap on={isRunning} onIcon={<IconPause size={14} />} offIcon={<IconPlay size={14} />} />,
                onClick: toggleTimer
              }
            : undefined
        }
      />

      <div className="top-bar-spacer" {...drag} />

      <div className="top-bar-tools">
        {mini.supported && (
          <IconButton
            label={mini.isOpen ? strings.actions.closeMini : strings.actions.openMini}
            active={mini.isOpen}
            onClick={mini.toggle}
            aria-pressed={mini.isOpen}
            data-tour="mini-player-btn"
          >
            <IconMiniPlayer size={19} />
          </IconButton>
        )}
        {onOpenNotifications && (
          <IconButton
            label={strings.header.notifTooltip}
            className={cx('bell-btn', alertRinging && 'is-ringing')}
            id="notifSettingsBtn"
            onClick={() => {
              clearBellDot();
              onOpenNotifications();
            }}
            data-tour="alerts-btn"
          >
            <IconBell size={19} className="bell-icon" />
            {/* The most important toast since the bell was last opened (color and toast icons carry the meaning). */}
            {bellDot && <span className={`bell-dot is-${bellDot}`} aria-hidden="true" />}
          </IconButton>
        )}
        <IconButton
          label={strings.header.soundToggleTooltip}
          id="soundToggleBtn"
          aria-pressed={state.sound}
          onClick={toggleSound}
        >
          <IconSwap on={state.sound} onIcon={<IconSoundOn size={19} />} offIcon={<IconSoundOff size={19} />} />
        </IconButton>
        <IconButton
          label={strings.header.helpTooltip}
          id="helpBtn"
          aria-haspopup="dialog"
          onClick={() => setHelpOpen(true)}
          data-tour="help-btn"
        >
          <IconHelp size={19} />
        </IconButton>
      </div>

      {desktop && <WindowControls />}
    </header>
  );
};
