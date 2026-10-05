import React from 'react';
import { strings } from '../../constants/strings';
import { UPDATES_CONFIGURED } from '../../constants/links';
import { isTauri } from '../../lib/desktop';
import { format } from '../../lib/i18n';
import { useUpdates } from '../../lib/updates';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { UpdateStatus } from './UpdateStatus';

/** Settings > Updates (desktop app with a release source only). */
export const UpdateSettings: React.FC = () => {
  const { state, notify, store } = useUpdates();
  if (!isTauri() || !UPDATES_CONFIGURED) return null;

  const busy = state.phase === 'checking' || state.phase === 'downloading' || state.phase === 'restarting';
  const retry = state.phase === 'failed' && state.step === 'install';
  return (
    <>
      <div className="section-divider" />
      <h4 className="section-title">{strings.updates.sectionTitle}</h4>
      <Switch
        label={strings.updates.notifyLabel}
        hint={strings.updates.notifyHint}
        checked={notify}
        onChange={checked => store.setNotify(checked)}
      />

      {state.phase === 'available' && (
        <p className="update-settings-ready">{format(strings.updates.readyTitle, { version: state.version })}</p>
      )}
      <UpdateStatus state={state} className="update-settings-status" />

      <div className="update-settings-actions">
        {state.phase === 'available' || retry ? (
          <Button variant="primary" onClick={() => store.install()}>
            {retry ? strings.updates.tryAgainBtn : strings.updates.installBtn}
          </Button>
        ) : (
          <Button onClick={() => store.check()} disabled={busy}>
            {strings.updates.checkBtn}
          </Button>
        )}
      </div>
    </>
  );
};
