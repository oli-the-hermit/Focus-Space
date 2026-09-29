import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { UPDATES_CONFIGURED } from '../../constants/links';
import { isTauri } from '../../lib/desktop';
import { format } from '../../lib/i18n';
import { useUpdates } from '../../lib/updates';
import { Button } from '../ui/Button';
import { IconSparkle } from '../ui/icons';
import { UpdateStatus } from './UpdateStatus';

/**
 * Desktop only: checks for an update once per launch (unless turned off in
 * Settings) and offers it in a card. Never appears while the timer runs; once
 * the user says yes it stays until the app restarts.
 */
export const UpdateNotice: React.FC = () => {
  const { state: app } = useApp();
  const { state, postponed, notify, store } = useUpdates();
  const enabled = isTauri() && UPDATES_CONFIGURED;

  useEffect(() => {
    if (enabled && notify) store.check();
    // Once per launch: turning the switch on later doesn't re-check (Settings has a button).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!enabled || !notify || postponed) return null;
  const working = state.phase === 'downloading' || state.phase === 'restarting';
  const offer = state.phase === 'available' && app.timer.status !== 'running';
  const retry = state.phase === 'failed' && state.step === 'install';
  if (!offer && !working && !retry) return null;

  const version = 'version' in state ? state.version ?? '' : '';
  return (
    <aside className="update-card" aria-label={format(strings.updates.readyTitle, { version })}>
      <span className="update-card-icon" aria-hidden="true">
        <IconSparkle size={20} />
      </span>
      <div className="update-card-text">
        <div className="update-card-title">{format(strings.updates.readyTitle, { version })}</div>
        {offer && <p className="update-card-body">{strings.updates.readyBody}</p>}
        <UpdateStatus state={state} className="update-card-status" />
        {!working && (
          <div className="update-card-actions">
            <Button size="sm" onClick={store.postpone}>{strings.updates.laterBtn}</Button>
            <Button size="sm" variant="primary" onClick={() => store.install()}>
              {retry ? strings.updates.tryAgainBtn : strings.updates.installBtn}
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
};
