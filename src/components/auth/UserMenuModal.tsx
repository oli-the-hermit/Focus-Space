import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { Modal } from '../ui/Modal';
import { strings } from '../../constants/strings';
import { Profile } from '../../types';
import { SettingsView } from './SettingsView';
import { FormActions } from '../ui/FormActions';
import { IconCheck, IconEdit, IconLock, IconTrash } from '../ui/icons';
import { Button } from '../ui/Button';
import { Field, TextInput } from '../ui/Field';

export interface UserMenuModalProps {
  /** Which view to show; null closes the modal (with its exit animation). */
  view: 'profile' | 'settings' | null;
  onClose: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

const MIN_PASSWORD = 8;

export const UserMenuModal: React.FC<UserMenuModalProps> = ({ view, onClose }) => {
  // Remember the last view so the content stays put while the modal closes.
  const lastView = useRef<'profile' | 'settings'>('profile');
  if (view) lastView.current = view;
  const shown = view ?? lastView.current;
  const title = shown === 'profile' ? strings.profile.title : strings.settings.title;
  return (
    <Modal isOpen={!!view} title={title} wide onClose={onClose}>
      {shown === 'profile' ? <ProfileView /> : <SettingsView />}
    </Modal>
  );
};

/** `inert` keeps collapsed fields out of the tab order (React 18 has no typed prop). */
const inertUnless = (open: boolean) => (open ? {} : ({ inert: '' } as Record<string, string>));

// ── PROFILE VIEW ─────────────────────────────────────────────────────────
const ProfileView: React.FC = () => {
  const { profile, token, refreshProfile, changePassword, deleteOwnProfile, showToast } = useApp();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? '');
  const [pwOpen, setPwOpen] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'none' | 'confirm' | 'password'>('none');
  const [deletePw, setDeletePw] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const curPwRef = useRef<HTMLInputElement>(null);

  if (!profile) return null;
  const isOwner = profile.role === 'owner';

  const identityDirty =
    displayName !== (profile.displayName ?? '') ||
    username !== (profile.username ?? '') ||
    avatar !== (profile.avatar ?? '');
  const pwLongEnough = newPw.length >= MIN_PASSWORD;
  const pwMatch = newPw.length > 0 && newPw === confirmPw;
  const pwValid = curPw.length > 0 && pwLongEnough && pwMatch;
  const dirty = identityDirty || (pwOpen && !!(curPw || newPw || confirmPw));
  // With the password section open, Save waits until every rule passes.
  const canSave =
    !saving &&
    (identityDirty || pwOpen) &&
    (!pwOpen || pwValid) &&
    !!displayName.trim() &&
    !!username.trim();

  const openPassword = () => {
    setPwOpen(true);
    setError('');
    window.setTimeout(() => curPwRef.current?.focus(), 60);
  };

  const closePassword = () => {
    setPwOpen(false);
    setCurPw('');
    setNewPw('');
    setConfirmPw('');
    setError('');
  };

  const discard = () => {
    setDisplayName(profile.displayName ?? '');
    setUsername(profile.username ?? '');
    setAvatar(profile.avatar ?? '');
    closePassword();
  };

  const pickAvatar = (file: File | undefined | null) => {
    setError('');
    if (!file) return;
    if (file.size > 1_000_000) {
      setError(strings.profile.photoTooLarge);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Cover-crop to a square so the round frame is always filled.
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        setAvatar(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setError('');
    if (!displayName.trim() || !username.trim()) {
      setError(strings.auth.fieldRequired);
      return;
    }
    setSaving(true);
    try {
      if (identityDirty) {
        const res = await api.put<{ profile: Profile }>(
          '/api/profile',
          { displayName: displayName.trim(), username: username.trim(), avatar },
          token
        );
        refreshProfile(res.profile);
      }
      if (pwOpen) {
        // Shows its own toast (and signs out other sessions).
        await changePassword(curPw, newPw);
        closePassword();
      } else {
        showToast(strings.profile.savedMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.profile.usernameTakenMsg);
    } finally {
      setSaving(false);
    }
  };

  const execDelete = async () => {
    setError('');
    setSaving(true);
    try {
      await deleteOwnProfile(deletePw);
      showToast(strings.profile.deleteOwnExecMsg);
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.profile.deleteOwnFallback);
      setDeletePw('');
      setDeleteStep('password');
      setSaving(false);
    }
  };

  return (
    <>
      {/* Identity: photo on the left, name and username on the right */}
      <div className="profile-identity">
        <div className={`profile-photo ${avatar ? 'has-photo' : ''}`}>
          <span className="profile-photo-img" aria-hidden="true">
            {avatar ? <img src={avatar} alt="" /> : initials(displayName || username)}
          </span>
          <button
            type="button"
            className="profile-photo-edit"
            onClick={() => fileRef.current?.click()}
            aria-label={strings.profile.changePhotoBtn}
            title={strings.profile.changePhotoBtn}
          >
            <IconEdit size={18} />
          </button>
          {avatar && (
            <button
              type="button"
              className="profile-photo-remove"
              onClick={() => setAvatar('')}
              aria-label={strings.profile.removePhotoBtn}
              title={strings.profile.removePhotoBtn}
            >
              <IconTrash size={14} />
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={e => {
              pickAvatar(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        <div className="profile-fields">
          <Field label={strings.profile.nameLabel} htmlFor="profileName">
            <TextInput
              id="profileName"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={40}
            />
          </Field>
          <Field label={strings.profile.usernameLabel} htmlFor="profileUsername">
            <TextInput
              id="profileUsername"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={24}
              autoComplete="username"
            />
          </Field>
        </div>
      </div>

      {/* Password: collapsed until the user asks to change it */}
      <div className={`password-block ${pwOpen ? 'is-open' : ''}`}>
        <div className="password-row">
          <span className="password-row-icon"><IconLock size={18} /></span>
          <div className="password-row-text">
            <span className="password-row-title">{strings.profile.passwordLabel}</span>
            <span className="password-row-hint">{strings.profile.passwordHint}</span>
          </div>
          {pwOpen ? (
            <Button size="sm" onClick={closePassword}>
              {strings.profile.keepPasswordBtn}
            </Button>
          ) : (
            <Button variant="tonal" size="sm" onClick={openPassword}>
              {strings.profile.changePasswordBtn}
            </Button>
          )}
        </div>

        <div className="collapsible" data-open={pwOpen}>
          <div className="collapsible-inner" {...inertUnless(pwOpen)}>
            <div className="password-fields">
              <Field label={strings.profile.currentPasswordLabel} htmlFor="curPw">
                <TextInput
                  ref={curPwRef}
                  id="curPw"
                  type="password"
                  value={curPw}
                  onChange={e => setCurPw(e.target.value)}
                  autoComplete="current-password"
                />
              </Field>
              <div className="form-row">
                <Field label={strings.profile.newPasswordLabel} htmlFor="newPw">
                  <TextInput
                    id="newPw"
                    type="password"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
                <Field label={strings.profile.confirmPasswordLabel} htmlFor="confirmPw">
                  <TextInput
                    id="confirmPw"
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
              <ul className="pw-rules" aria-live="polite">
                <li className={pwLongEnough ? 'is-met' : ''}>
                  <IconCheck size={14} strokeWidth={2.6} />
                  {strings.profile.ruleLength}
                </li>
                <li className={pwMatch ? 'is-met' : ''}>
                  <IconCheck size={14} strokeWidth={2.6} />
                  {strings.profile.ruleMatch}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Delete own profile (regular users only) */}
      {!isOwner && (
        <>
          <div className="section-divider" />
          <h4 className="section-title danger-text">{strings.profile.deleteOwnTitle}</h4>
          {deleteStep === 'none' && (
            <Button variant="danger" onClick={() => setDeleteStep('confirm')}>
              {strings.profile.deleteOwnBtn}
            </Button>
          )}
          {deleteStep === 'confirm' && (
            <div className="danger-panel">
              <p className="danger-panel-msg">{strings.profile.deleteOwnConfirmMsg}</p>
              <div className="modal-actions">
                <Button onClick={() => setDeleteStep('none')}>
                  {strings.profile.cancelBtn}
                </Button>
                <Button variant="danger" onClick={() => setDeleteStep('password')}>
                  {strings.profile.deleteBtn}
                </Button>
              </div>
            </div>
          )}
          {deleteStep === 'password' && (
            <div className="danger-panel">
              <p className="danger-panel-msg">{strings.profile.deleteOwnConfirmMsg}</p>
              <Field label={strings.auth.passwordLabel}>
                <TextInput
                  type="password"
                  value={deletePw}
                  onChange={e => setDeletePw(e.target.value)}
                  autoComplete="current-password"
                />
              </Field>
              <div className="modal-actions">
                <Button
                  onClick={() => {
                    setDeleteStep('none');
                    setDeletePw('');
                  }}
                >
                  {strings.profile.cancelBtn}
                </Button>
                <Button variant="danger" onClick={execDelete} disabled={saving}>
                  {strings.profile.deleteBtn}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      <FormActions
        dirty={dirty}
        cancelLabel={strings.common.discardChanges}
        onCancel={discard}
        primaryLabel={strings.profile.saveBtn}
        primaryDisabled={!canSave}
        onPrimary={save}
      />
    </>
  );
};
