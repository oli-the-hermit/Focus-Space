import React from 'react';
import { useApp } from '../../context/AppContext';
import { useMiniPlayer } from '../../mini/MiniPlayerProvider';
import { strings } from '../../constants/strings';
import { formatClock } from '../../lib/formatUtils';
import { getActiveSession, getCurrentTask, getPhaseTimes } from '../../lib/timerSnapshot';
import {
  IconEdit,
  IconGift,
  IconMiniPlayer,
  IconPause,
  IconPlay,
  IconReset,
  IconSkip,
  IconSoundOff,
  IconSoundOn
} from '../ui/icons';
import { IconSwap } from '../ui/IconSwap';
import { useContextMenu } from '../ui/ContextMenu';
import { MenuItem } from '../ui/Menu';
import { Card } from '../ui/Card';
import { PlayerControl } from '../ui/PlayerControl';
import { Scrubber } from './Scrubber';
import { cx } from '../../lib/cx';
import { format, plural } from '../../lib/i18n';
import { shortcutHint } from '../../constants/shortcuts';
import { phaseMinutes } from '../../lib/sessionTime';

/**
 * The timer, laid out like a music player: artwork tile with the countdown,
 * session as the "track", the current task as the "artist", a scrubber and
 * transport controls.
 */
export const PlayerCard: React.FC = () => {
  const { state, toggleTimer, resetTimer, skipPhase, toggleSound, openModal, alertRinging } = useApp();
  const mini = useMiniPlayer();
  const contextMenu = useContextMenu();

  const session = getActiveSession(state);
  const { total, remaining } = getPhaseTimes(state, session);
  const elapsed = Math.max(0, total - remaining);
  const pct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;

  const isBreak = state.timer.phase === 'break';
  const isRunning = state.timer.status === 'running';
  const currentTask = getCurrentTask(state, session);
  const reward = session?.rewardId ? state.rewards.find(r => r.id === session.rewardId) : null;

  const nextPhaseLabel = isBreak ? strings.timer.focusPhase : strings.timer.breakPhase;
  const nextPhaseMins = phaseMinutes(session, isBreak ? 'focus' : 'break');

  const cm = strings.actions;
  const menuItems = (): (MenuItem | false)[] => [
    {
      key: 'toggle',
      label: isRunning ? cm.pauseTimer : cm.startTimer,
      icon: isRunning ? <IconPause size={15} /> : <IconPlay size={15} />,
      hint: shortcutHint('toggleTimer'),
      onSelect: toggleTimer
    },
    { key: 'reset', label: cm.resetTimer, icon: <IconReset size={16} />, hint: shortcutHint('reset'), onSelect: resetTimer },
    { key: 'skip', label: isBreak ? cm.skipToFocus : cm.skipToBreak, icon: <IconSkip size={16} />, hint: shortcutHint('skip'), onSelect: skipPhase },
    { key: 'd1', divider: true },
    {
      key: 'sound',
      label: state.sound ? cm.soundOff : cm.soundOn,
      icon: state.sound ? <IconSoundOff size={16} /> : <IconSoundOn size={16} />,
      onSelect: toggleSound
    },
    mini.supported && {
      key: 'mini',
      label: mini.isOpen ? cm.closeMini : cm.openMini,
      icon: <IconMiniPlayer size={16} />,
      hint: shortcutHint('miniPlayer'),
      onSelect: mini.toggle
    },
    !!session && { key: 'd2', divider: true },
    !!session && {
      key: 'edit',
      label: cm.editSession,
      icon: <IconEdit size={15} />,
      onSelect: () => openModal('EDIT_SESSION', { session })
    }
  ];

  return (
    <Card
      className={cx('player-card', isBreak ? 'is-break' : 'is-focus', isRunning && 'is-running', alertRinging && 'is-ringing')}
      onContextMenu={e => contextMenu(e, menuItems())}
    >
      <div className="player-head">
        <span className="overline">{strings.timer.nowPlaying}</span>
        <span className={`phase-chip ${isBreak ? 'is-break' : ''}`}>
          {isBreak ? strings.timer.breakPhase : strings.timer.focusPhase}
        </span>
      </div>

      <div className="player-art" aria-live="off">
        <span className="player-art-phase">
          {isBreak ? strings.timer.breakPhase : strings.timer.focusPhase}
        </span>
        <span className="player-art-time" role="timer" aria-label={format(strings.timer.remainingAria, { time: formatClock(remaining) })}>
          {formatClock(remaining)}
        </span>
        <span className="player-art-foot">
          {plural(state.timer.sessionsCompletedToday, strings.timer.completedToday)}
        </span>
      </div>

      <div className="player-track">
        <h2 className="player-title" title={session?.name}>{session ? session.name : strings.timer.noSession}</h2>
        <p className="player-subtitle" title={currentTask || ''}>{currentTask || strings.timer.noOpenTasks}</p>
      </div>

      <div className="player-scrubber">
        <Scrubber value={pct} label={strings.timer.sessionProgress} knob />
        <div className="scrubber-times">
          <span>{formatClock(elapsed)}</span>
          <span className="scrubber-pct">{Math.round(pct)}%</span>
          <span>{formatClock(total)}</span>
        </div>
      </div>

      <div className="player-controls" data-tour="player-controls">
        <PlayerControl
          variant="ghost"
          pressed={state.sound}
          onClick={toggleSound}
          label={strings.header.soundToggleTooltip}
          title={state.sound ? strings.timer.soundOnTooltip : strings.timer.soundOffTooltip}
        >
          <IconSwap on={state.sound} onIcon={<IconSoundOn size={19} />} offIcon={<IconSoundOff size={19} />} />
        </PlayerControl>
        <PlayerControl id="resetBtn" onClick={resetTimer} label={strings.actions.resetTimer}>
          <IconReset size={20} />
        </PlayerControl>
        <PlayerControl
          variant="primary"
          id="playPauseBtn"
          onClick={toggleTimer}
          label={isRunning ? strings.timer.pauseTooltip : strings.timer.playTooltip}
        >
          <IconSwap on={isRunning} onIcon={<IconPause size={28} />} offIcon={<IconPlay size={28} />} />
        </PlayerControl>
        <PlayerControl id="skipBtn" onClick={skipPhase} label={strings.timer.skipTooltip}>
          <IconSkip size={20} />
        </PlayerControl>
        <PlayerControl
          variant="ghost"
          pressed={mini.isOpen}
          onClick={mini.toggle}
          disabled={!mini.supported}
          label={mini.isOpen ? strings.actions.closeMini : strings.actions.openMini}
        >
          <IconMiniPlayer size={19} />
        </PlayerControl>
      </div>

      <div className="player-foot">
        <div className="player-foot-row">
          <span className="player-foot-label">{strings.timer.upNext}</span>
          <span className="player-foot-value">
            {nextPhaseLabel} · {formatClock(nextPhaseMins * 60)}
          </span>
        </div>
        {reward && (
          <div className="player-foot-row" id="sessionRewardHint">
            <span className="player-foot-label">
              <IconGift size={14} />
              {strings.timer.rewardOnCompletion.replace(':', '')}
            </span>
            <span className="player-foot-value" title={reward.name}>
              {reward.emoji} {reward.name}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};
