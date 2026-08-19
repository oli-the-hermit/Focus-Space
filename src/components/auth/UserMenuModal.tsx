import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { Modal } from '../ui/Modal';
import { strings } from '../../constants/strings';
import { Profile } from '../../types';
import { SettingsView } from './SettingsView';

export interface UserMenuModalProps {
  view: 'profile' | 'settings';
  onClose: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export const UserMenuModal: React.FC<UserMenuModalProps> = ({ view, onClose }) => {
  const title = view === 'profile' ? strings.profile.title : strings.settings.title;
  return (
    <Modal isOpen title={title} wide onClose={onClose}>
      {view === 'profile' ? <ProfileView /> : <SettingsView />}
    </Modal>
  );
};

// ── PROFILE VIEW ─────────────────────────────────────────────────────────
const ProfileView: React.FC = () => {
  const { profile, token, refreshProfile, changePassword, deleteOwnProfile, showToast } = useApp();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [avatar, setAvatar] = useState(profile?.avatar ?? '');
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'none' | 'confirm' | 'password'>('none');
  const [deletePw, setDeletePw] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!profile) return null;
  const isOwner = profile.role === 'owner';

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
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        setAvatar(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setError('');
    if (!displayName.trim() || !username.trim()) {
      setError(strings.auth.fieldRequired);
      return;
    }
    setSaving(true);
    try {
      const res = await api.put<{ profile: Profile }>(
        '/api/profile',
        { displayName: displayName.trim(), username: username.trim(), avatar },
        token
      );
      refreshProfile(res.profile);
      showToast(strings.profile.savedMsg);
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.profile.usernameTakenMsg);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    setError('');
    if (!curPw || !newPw) {
      setError(strings.auth.fieldRequired);
      return;
    }
    if (newPw.length < 8) {
      setError(strings.auth.weakPassword);
      return;
    }
    if (newPw !== confirmPw) {
      setError(strings.profile.passwordsDontMatchMsg);
      return;
    }
    setSaving(true);
    try {
      await changePassword(curPw, newPw);
      setCurPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.profile.wrongPasswordMsg);
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
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeletePw('');
      setDeleteStep('password');
      setSaving(false);
    }
  };

  return (
    <>
      {/* Basic info */}
      <div className="profile-avatar-row">
        <span className="profile-avatar-lg">
          {avatar ? <img src={avatar} alt="" className="user-avatar-img" /> : initials(displayName)}
        </span>
        <div className="profile-avatar-actions">
          <button type="button" className="btn-action" onClick={() => fileRef.current?.click()}>
            {strings.profile.changePhotoBtn}
          </button>
          {avatar && (
            <button type="button" className="btn-action" onClick={() => setAvatar('')}>
              {strings.profile.removePhotoBtn}
            </button>
          )}
        </div>
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

      <div className="form-group">
        <label className="form-label">{strings.profile.nameLabel}</label>
        <input
          className="form-input"
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          maxLength={40}
        />
      </div>

      <div className="form-group">
        <label className="form-label">{strings.profile.usernameLabel}</label>
        <input
          className="form-input"
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          maxLength={24}
        />
      </div>

      <button type="button" className="btn-action primary" onClick={saveProfile} disabled={saving}>
        {strings.profile.saveBtn}
      </button>

      <div className="section-divider" />

      {/* Password change */}
      <h4 className="section-title">{strings.profile.passwordSectionTitle}</h4>
      <div className="form-group">
        <label className="form-label">{strings.profile.currentPasswordLabel}</label>
        <input
          className="form-input"
          type="password"
          value={curPw}
          onChange={e => setCurPw(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{strings.profile.newPasswordLabel}</label>
          <input
            className="form-input"
            type="password"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="form-group">
          <label className="form-label">{strings.profile.confirmPasswordLabel}</label>
          <input
            className="form-input"
            type="password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      </div>
      <button type="button" className="btn-action" onClick={savePassword} disabled={saving}>
        {strings.profile.saveBtn}
      </button>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      {/* Delete own profile (regular users only) */}
      {!isOwner && (
        <>
          <div className="section-divider" />
          <h4 className="section-title danger-text">{strings.profile.deleteOwnTitle}</h4>
          {deleteStep === 'none' && (
            <button type="button" className="btn-action danger" onClick={() => setDeleteStep('confirm')}>
              {strings.profile.deleteOwnBtn}
            </button>
          )}
          {deleteStep === 'confirm' && (
            <div className="danger-panel">
              <p className="danger-panel-msg">{strings.profile.deleteOwnConfirmMsg}</p>
              <div className="modal-actions">
                <button type="button" className="btn-action" onClick={() => setDeleteStep('none')}>
                  {strings.profile.cancelBtn}
                </button>
                <button type="button" className="btn-action danger" onClick={() => setDeleteStep('password')}>
                  {strings.profile.deleteBtn}
                </button>
              </div>
            </div>
          )}
          {deleteStep === 'password' && (
            <div className="danger-panel">
              <p className="danger-panel-msg">{strings.profile.deleteOwnConfirmMsg}</p>
              <div className="form-group">
                <label className="form-label">{strings.auth.passwordLabel}</label>
                <input
                  className="form-input"
                  type="password"
                  value={deletePw}
                  onChange={e => setDeletePw(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-action"
                  onClick={() => {
                    setDeleteStep('none');
                    setDeletePw('');
                  }}
                >
                  {strings.profile.cancelBtn}
                </button>
                <button type="button" className="btn-action danger" onClick={execDelete} disabled={saving}>
                  {strings.profile.deleteBtn}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};