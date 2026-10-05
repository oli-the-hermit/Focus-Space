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
import { FormRow, ModalForm } from '../ui/FormLayout';
import { Switch } from '../ui/Switch';
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
      {isOpen && <NotificationForm onDone={onClose} />}
    </Modal>
  );
};

/**
 * The notification settings form, used by the bell's dialog and by Settings.
 * `onDone` runs after Save and after Cancel; remount the form (a new `key`) to
 * start again from the saved settings.
 */
export const NotificationForm: React.FC<{ onDone: () => void }> = ({ onDone }) => {
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
    onDone();
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
    <ModalForm as="div" className="notif-form">
      <Switch
        label={n.phaseAlertsLabel}
        hint={n.phaseAlertsHint}
        checked={draft.phaseAlerts}
        onChange={checked => set({ phaseAlerts: checked })}
      />

      <Switch label={n.enableLabel} checked={draft.enabled} onChange={checked => set({ enabled: checked })} />

      <FormRow>
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
      </FormRow>

      <Switch label={n.soundLabel} checked={draft.sound} onChange={checked => set({ sound: checked })} />

      {/* Desktop alerts use their own window; only the browser needs permission. */}
      {!desktop && (
        <div className={`permission-row is-${permission}`}>
          <div className="permission-row-text">
            <span className="permission-row-title">{n.browserPermLabel}</span>
            <span className="permission-row-hint">{permissionMsg}</span>
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

      <FormActions dirty={dirty} onCancel={onDone} primaryLabel={strings.common.save} primaryDisabled={!dirty} onPrimary={save} />
    </ModalForm>
  );
};
