import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { Modal } from '../ui/Modal';
import { strings } from '../../constants/strings';
import { Profile } from '../../types';
import { SettingsView } from './SettingsView';
import { AppearanceView } from './AppearanceView';
import { FormActions } from '../ui/FormActions';
import { IconCheck, IconEdit, IconLock, IconTrash } from '../ui/icons';
import { Button } from '../ui/Button';
import { ActionRow } from '../ui/ActionRow';
import { Collapsible } from '../ui/Collapsible';
import { Field, TextInput } from '../ui/Field';
import { FormRow } from '../ui/FormLayout';
import { initials } from '../../lib/formatUtils';
import { LIMITS } from '../../constants/limits';
import { format } from '../../lib/i18n';

export type UserMenuView = 'profile' | 'appearance' | 'settings';

export interface UserMenuModalProps {
  /** Which view to show; null closes the modal (with its exit animation). */
  view: UserMenuView | null;
  onClose: () => void;
}

const VIEWS: Record<UserMenuView, { title: string; Body: React.FC }> = {
  // A wrapper: ProfileView is declared further down this file.
  profile: { title: strings.profile.title, Body: () => <ProfileView /> },
  appearance: { title: strings.appearance.title, Body: AppearanceView },
  settings: { title: strings.settings.title, Body: SettingsView }
};

export const UserMenuModal: React.FC<UserMenuModalProps> = ({ view, onClose }) => {
  // Remember the last view so the content stays put while the modal closes.
  const lastView = useRef<UserMenuView>('profile');
  if (view) lastView.current = view;
  const { title, Body } = VIEWS[view ?? lastView.current];
  return (
    <Modal isOpen={!!view} title={title} wide onClose={onClose}>
      <Body />
    </Modal>
  );
};

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
  /** Shown right under the photo, where the user is looking after picking one. */
  const [photoError, setPhotoError] = useState('');
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
  const pwLongEnough = newPw.length >= LIMITS.password.min;
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

  /** Any common photo: cover-cropped to a square, resized, saved as a lossless PNG. */
  const pickAvatar = (file: File | undefined | null) => {
    setPhotoError('');
    if (!file) return;
    if (file.size > LIMITS.avatar.sourceMaxBytes) {
      setPhotoError(format(strings.profile.photoTooLarge, { mb: LIMITS.avatar.sourceMaxBytes / 1_000_000 }));
      return;
    }
    const unreadable = () => setPhotoError(strings.profile.photoUnreadable);
    const reader = new FileReader();
    reader.onerror = unreadable;
    reader.onload = () => {
      const img = new Image();
      // e.g. HEIC photos, which the app's browser engine can't decode.
      img.onerror = unreadable;
      img.onload = () => {
        const size = LIMITS.avatar.sizePx;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return unreadable();
        // Cover-crop to a square so the round frame is always filled.
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        setAvatar(canvas.toDataURL('image/png'));
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
      setError(err instanceof Error ? err.message : strings.errors.requestInterrupted);
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
              onClick={() => {
                setAvatar('');
                setPhotoError('');
              }}
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
              maxLength={LIMITS.displayName.max}
            />
          </Field>
          <Field label={strings.profile.usernameLabel} htmlFor="profileUsername">
            <TextInput
              id="profileUsername"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={LIMITS.username.max}
              autoComplete="username"
            />
          </Field>
        </div>
      </div>
      {photoError && (
        <div className="auth-error profile-photo-error" role="alert">
          {photoError}
        </div>
      )}

      {/* Password: collapsed until the user asks to change it */}
      <div className={`password-block ${pwOpen ? 'is-open' : ''}`}>
        <div className="password-row">
          <span className="password-row-icon"><IconLock size={18} /></span>
          <div className="password-row-text">
            <span className="password-row-title">{strings.profile.passwordLabel}</span>
            <span className="password-row-hint">{format(strings.profile.passwordHint, { min: LIMITS.password.min })}</span>
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

        <Collapsible open={pwOpen}>
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
            <FormRow>
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
            </FormRow>
            <ul className="pw-rules" aria-live="polite">
              <li className={pwLongEnough ? 'is-met' : ''}>
                <IconCheck size={14} strokeWidth={2.6} />
                {format(strings.profile.ruleLength, { min: LIMITS.password.min })}
              </li>
              <li className={pwMatch ? 'is-met' : ''}>
                <IconCheck size={14} strokeWidth={2.6} />
                {strings.profile.ruleMatch}
              </li>
            </ul>
          </div>
        </Collapsible>
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
              <ActionRow>
                <Button onClick={() => setDeleteStep('none')}>
                  {strings.common.cancel}
                </Button>
                <Button variant="danger" onClick={() => setDeleteStep('password')}>
                  {strings.common.delete}
                </Button>
              </ActionRow>
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
              <ActionRow>
                <Button
                  onClick={() => {
                    setDeleteStep('none');
                    setDeletePw('');
                  }}
                >
                  {strings.common.cancel}
                </Button>
                <Button variant="danger" onClick={execDelete} disabled={saving}>
                  {strings.common.delete}
                </Button>
              </ActionRow>
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
        primaryLabel={strings.common.saveChanges}
        primaryDisabled={!canSave}
        onPrimary={save}
      />
    </>
  );
};
