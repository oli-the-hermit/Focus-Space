import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { strings } from '../../constants/strings';
import { Profile, ThemeMode } from '../../types';
import { Button } from '../ui/Button';
import { Field, TextInput } from '../ui/Field';

export const MAX_PROFILES = 6;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: strings.settings.themeLight },
  { value: 'dark', label: strings.settings.themeDark },
  { value: 'system', label: strings.settings.themeSystem }
];

export const SettingsView: React.FC = () => {
  const { state, updateTheme, profile, token, showToast } = useApp();
  const isOwner = profile?.role === 'owner';

  // ── Owner: profiles manager ──────────────────────────────────────────
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addPw, setAddPw] = useState('');
  const [addConfirm, setAddConfirm] = useState('');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // ── Danger zone ──────────────────────────────────────────────────────
  const [resetStep, setResetStep] = useState<'none' | 'confirm' | 'password'>('none');
  const [resetPw, setResetPw] = useState('');

  useEffect(() => {
    if (isOwner && profiles === null) loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  const loadProfiles = async () => {
    try {
      const res = await api.get<{ profiles: Profile[] }>('/api/profiles', token);
      setProfiles(res.profiles);
    } catch {
      setProfiles([]);
    }
  };

  const addProfile = async () => {
    setError('');
    if (!addName.trim() || !addUsername.trim() || !addPw) {
      setError(strings.auth.fieldRequired);
      return;
    }
    if (addPw.length < 8) {
      setError(strings.auth.weakPassword);
      return;
    }
    if (addPw !== addConfirm) {
      setError(strings.auth.passwordsDontMatch);
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/profiles', {
        displayName: addName.trim(),
        username: addUsername.trim(),
        password: addPw
      }, token);
      setAddName('');
      setAddUsername('');
      setAddPw('');
      setAddConfirm('');
      setShowAddForm(false);
      await loadProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.errors.createProfile);
    } finally {
      setBusy(false);
    }
  };

  const renameProfile = async (id: number) => {
    setError('');
    if (!renameVal.trim()) return;
    setBusy(true);
    try {
      await api.put(`/api/profiles/${id}`, { displayName: renameVal.trim() }, token);
      setRenamingId(null);
      await loadProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.errors.renameProfile);
    } finally {
      setBusy(false);
    }
  };

  const deleteProfile = async (target: Profile) => {
    setError('');
    setBusy(true);
    try {
      await api.del(`/api/profiles/${target.id}`, undefined, token);
      setDeleting(null);
      await loadProfiles();
      showToast(strings.toasts.profileRemoved.replace('{name}', target.displayName));
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.errors.deleteProfile);
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  const execReset = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await api.post<{ deleted: number }>('/api/reset-profiles', { password: resetPw }, token);
      setResetStep('none');
      setResetPw('');
      setProfiles(null);
      showToast(strings.settings.resetOkMsg + (res.deleted > 0 ? ` (${res.deleted})` : ''));
      await loadProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.errors.resetProfiles);
    } finally {
      setBusy(false);
    }
  };

  const profileCount = profiles?.length ?? 1;

  return (
    <>
      {/* Appearance */}
      <h4 className="section-title">{strings.settings.appearanceTitle}</h4>
      <div className="theme-segmented" role="radiogroup" aria-label={strings.settings.appearanceTitle}>
        {THEME_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={state.theme === opt.value}
            className={`seg-option ${state.theme === opt.value ? 'active' : ''}`}
            onClick={() => updateTheme(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Profiles manager — owner only */}
      {isOwner && (
        <>
          <div className="section-divider" />
          <h4 className="section-title">{strings.settings.profilesSectionTitle}</h4>
          <p className="settings-subtitle">
            {strings.settings.profileCounter
              .replace('{count}', String(profileCount))
              .replace('{max}', String(MAX_PROFILES))}
          </p>

          <div className="profile-list">
            {(profiles || []).map(p => (
              <div className="profile-row" key={p.id}>
                <span className="profile-row-avatar">
                  {p.avatar ? <img src={p.avatar} alt="" /> : initials(p.displayName)}
                </span>
                <div className="profile-row-info">
                  <span className="profile-row-name">
                    {p.displayName}
                    {p.role === 'owner' && <span className="role-badge">{strings.auth.mainBadge}</span>}
                  </span>
                  <span className="profile-row-meta">
                    @{p.username} · {formatDate(p.createdAt)}
                  </span>
                </div>
                <div className="profile-row-actions">
                  {renamingId === p.id ? (
                    <div className="rename-inline">
                      <TextInput
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') renameProfile(p.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        maxLength={40}
                        autoFocus
                      />
                      <Button variant="primary" onClick={() => renameProfile(p.id)} disabled={busy}>
                        {strings.settings.renameBtn}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          setRenamingId(p.id);
                          setRenameVal(p.displayName);
                        }}
                        disabled={p.id === profile?.id}
                        title={p.id === profile?.id ? 'Main account' : strings.settings.renameBtn}
                      >
                        {strings.settings.renameBtn}
                      </Button>
                      {p.id !== profile?.id && (
                        <Button
                          variant="danger"
                          onClick={() => setDeleting(p)}
                          disabled={busy}
                        >
                          {strings.settings.deleteBtn}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {showAddForm ? (
            <div className="add-profile-form">
              <Field label={strings.auth.displayNameLabel}>
                <TextInput value={addName} onChange={e => setAddName(e.target.value)} maxLength={40} autoFocus />
              </Field>
              <Field label={strings.auth.usernameLabel}>
                <TextInput value={addUsername} onChange={e => setAddUsername(e.target.value)} maxLength={24} />
              </Field>
              <div className="form-row">
                <Field label={strings.auth.passwordLabel}>
                  <TextInput type="password" value={addPw} onChange={e => setAddPw(e.target.value)} autoComplete="new-password" />
                </Field>
                <Field label={strings.auth.confirmPasswordLabel}>
                  <TextInput type="password" value={addConfirm} onChange={e => setAddConfirm(e.target.value)} autoComplete="new-password" />
                </Field>
              </div>
              <div className="modal-actions">
                <Button onClick={() => setShowAddForm(false)}>
                  {strings.profile.cancelBtn}
                </Button>
                <Button variant="primary" onClick={addProfile} disabled={busy || profileCount >= MAX_PROFILES}>
                  {strings.settings.addProfileTitle}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowAddForm(true)}
              disabled={profileCount >= MAX_PROFILES}
              title={profileCount >= MAX_PROFILES ? `Max ${MAX_PROFILES} profiles` : undefined}
            >
              {strings.settings.addProfileBtn}
            </Button>
          )}

          {/* Danger zone */}
          <div className="section-divider" />
          <h4 className="section-title danger-text">{strings.settings.dangerZoneTitle}</h4>
          <p className="settings-subtitle">{strings.settings.resetProfilesDesc}</p>

          {resetStep === 'none' && (
            <Button variant="danger" onClick={() => setResetStep('confirm')}>
              {strings.settings.resetProfilesBtn}
            </Button>
          )}

          {resetStep === 'confirm' && (
            <div className="danger-panel">
              <p className="danger-panel-title">{strings.settings.resetConfirmTitle}</p>
              <p className="danger-panel-msg">{strings.settings.resetConfirmMsg}</p>
              <div className="modal-actions">
                <Button onClick={() => setResetStep('none')}>
                  {strings.settings.cancelBtn}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setResetStep('password')}
                >
                  {strings.profile.deleteBtn}
                </Button>
              </div>
            </div>
          )}

          {resetStep === 'password' && (
            <div className="danger-panel">
              <p className="danger-panel-title">{strings.settings.resetPasswordTitle}</p>
              <p className="danger-panel-msg">{strings.settings.resetPasswordMsg}</p>
              <Field label={strings.auth.passwordLabel}>
                <TextInput
                  type="password"
                  value={resetPw}
                  onChange={e => setResetPw(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') execReset();
                  }}
                  autoComplete="current-password"
                  autoFocus
                />
              </Field>
              <div className="modal-actions">
                <Button
                  onClick={() => {
                    setResetStep('none');
                    setResetPw('');
                  }}
                >
                  {strings.settings.cancelBtn}
                </Button>
                <Button variant="danger" onClick={execReset} disabled={busy}>
                  {strings.profile.deleteBtn}
                </Button>
              </div>
            </div>
          )}

          {deleting && (
            <div className="danger-panel">
              <p className="danger-panel-title">
                {strings.settings.deleteBtn} “{deleting.displayName}”
              </p>
              <p className="danger-panel-msg">{strings.settings.deleteProfileConfirmMsg}</p>
              <div className="modal-actions">
                <Button onClick={() => setDeleting(null)}>
                  {strings.settings.cancelBtn}
                </Button>
                <Button variant="danger" onClick={() => deleteProfile(deleting)} disabled={busy}>
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
    </>
  );
};