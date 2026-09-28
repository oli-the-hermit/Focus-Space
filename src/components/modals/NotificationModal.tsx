import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { FormActions } from '../ui/FormActions';
import { strings } from '../../constants/strings';
import { NotificationSettings } from '../../types';
import { isTauri } from '../../lib/desktop';
import {
  WebPermission,
  requestWebNotificationPermission,
  webNotificationPermission
} from '../../lib/notify';
import { useDirty } from '../../hooks/useDirty';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { plural } from '../../lib/i18n';

export interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AUTO_DISMISS_OPTIONS = [5, 10, 20, 30];

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} title={strings.notifications.modalTitle} onClose={onClose}>
      {/* Remounted on every open, so the draft starts from the saved settings. */}
      {isOpen && <NotificationForm onClose={onClose} />}
    </Modal>
  );
};

const NotificationForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state, updateNotifications, showToast } = useApp();
  const [draft, setDraft] = useState<NotificationSettings>(state.notifications);
  const [permission, setPermission] = useState<WebPermission>(webNotificationPermission);
  const dirty = useDirty(draft);
  const desktop = isTauri();

  // The user may change the permission in the browser while this is open.
  useEffect(() => {
    if (desktop) return;
    const refresh = () => setPermission(webNotificationPermission());
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [desktop]);

  const set = (patch: Partial<NotificationSettings>) => setDraft(d => ({ ...d, ...patch }));

  const save = () => {
    updateNotifications(draft);
    showToast(strings.notifications.savedMsg);
    onClose();
  };

  const n = strings.notifications;
  const permissionMsg =
    permission === 'granted'
      ? n.permGrantedMsg
      : permission === 'denied'
        ? n.permDeniedMsg
        : permission === 'unsupported'
          ? n.permUnsupportedMsg
          : n.permDefaultMsg;

  return (
    <div className="modal-form notif-form">
      <label className="switch-row">
        <span className="switch-row-text">
          <span className="switch-row-title">{n.phaseAlertsLabel}</span>
          <span className="switch-row-hint">{n.phaseAlertsHint}</span>
        </span>
        <input
          type="checkbox"
          className="switch"
          checked={draft.phaseAlerts}
          onChange={e => set({ phaseAlerts: e.target.checked })}
        />
      </label>

      <label className="switch-row">
        <span className="switch-row-text">
          <span className="switch-row-title">{n.enableLabel}</span>
        </span>
        <input
          type="checkbox"
          className="switch"
          checked={draft.enabled}
          onChange={e => set({ enabled: e.target.checked })}
        />
      </label>

      <div className="form-row">
        <Field label={n.leadTimeLabel}>
          <Select<number>
            value={draft.leadMinutes}
            onChange={val => set({ leadMinutes: val })}
            disabled={!draft.enabled}
            options={[
              { value: 5, label: n.options.fiveMin },
              { value: 10, label: n.options.tenMin },
              { value: 15, label: n.options.fifteenMin },
              { value: 30, label: n.options.thirtyMin }
            ]}
          />
        </Field>
        <Field label={n.autoDismissLabel}>
          <Select<number>
            value={draft.autoDismissSec}
            onChange={val => set({ autoDismissSec: val })}
            options={AUTO_DISMISS_OPTIONS.map(v => ({ value: v, label: plural(v, n.autoDismissValue) }))}
          />
        </Field>
      </div>

      <label className="switch-row">
        <span className="switch-row-text">
          <span className="switch-row-title">{n.soundLabel}</span>
        </span>
        <input
          type="checkbox"
          className="switch"
          checked={draft.sound}
          onChange={e => set({ sound: e.target.checked })}
        />
      </label>

      {/* Desktop alerts use their own window; only the browser needs permission. */}
      {!desktop && (
        <div className={`permission-row is-${permission}`}>
          <div className="permission-row-text">
            <span className="switch-row-title">{n.browserPermLabel}</span>
            <span className="switch-row-hint">{permissionMsg}</span>
          </div>
          {permission === 'default' && (
            <Button
              variant="tonal"
              size="sm"
              onClick={() => requestWebNotificationPermission().then(setPermission)}
            >
              {n.requestPermBtn}
            </Button>
          )}
        </div>
      )}

      <FormActions dirty={dirty} onCancel={onClose} primaryLabel={strings.common.save} primaryDisabled={!dirty} onPrimary={save} />
    </div>
  );
};
