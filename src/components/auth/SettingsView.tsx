import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { strings } from '../../constants/strings';
import { Profile, ThemeMode } from '../../types';

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
      setError(err instanceof Error ? err.message : 'Failed to create profile');
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
      setError(err instanceof Error ? err.message : 'Rename failed');
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
      showToast(`Profile "${target.displayName}" deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
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
      setError(err instanceof Error ? err.message : 'Reset failed');
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
                    {p.role === 'owner' && <span className="role-badge">Main</span>}
                  </span>
                  <span className="profile-row-meta">
                    @{p.username} · {formatDate(p.createdAt)}
                  </span>
                </div>
                <div className="profile-row-actions">
                  {renamingId === p.id ? (
                    <div className="rename-inline">
                      <input
                        className="form-input"
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') renameProfile(p.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        maxLength={40}
                        autoFocus
                      />
                      <button type="button" className="btn-action primary" onClick={() => renameProfile(p.id)} disabled={busy}>
                        {strings.settings.renameBtn}
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn-action"
                        onClick={() => {
                          setRenamingId(p.id);
                          setRenameVal(p.displayName);
                        }}
                        disabled={p.id === profile?.id}
                        title={p.id === profile?.id ? 'Main account' : strings.settings.renameBtn}
                      >
                        {strings.settings.renameBtn}
                      </button>
                      {p.id !== profile?.id && (
                        <button
                          type="button"
                          className="btn-action danger icon-only-del"
                          onClick={() => setDeleting(p)}
                          disabled={busy}
                          title={strings.settings.deleteBtn}
                        >
                          {strings.settings.deleteBtn}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {showAddForm ? (
            <div className="add-profile-form">
              <div className="form-group">
                <label className="form-label">{strings.auth.displayNameLabel}</label>
                <input className="form-input" value={addName} onChange={e => setAddName(e.target.value)} maxLength={40} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">{strings.auth.usernameLabel}</label>
                <input className="form-input" value={addUsername} onChange={e => setAddUsername(e.target.value)} maxLength={24} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{strings.auth.passwordLabel}</label>
                  <input className="form-input" type="password" value={addPw} onChange={e => setAddPw(e.target.value)} autoComplete="new-password" />
                </div>
                <div className="form-group">
                  <label className="form-label">{strings.auth.confirmPasswordLabel}</label>
                  <input className="form-input" type="password" value={addConfirm} onChange={e => setAddConfirm(e.target.value)} autoComplete="new-password" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-action" onClick={() => setShowAddForm(false)}>
                  {strings.profile.cancelBtn}
                </button>
                <button type="button" className="btn-action primary" onClick={addProfile} disabled={busy || profileCount >= MAX_PROFILES}>
                  {strings.settings.addProfileTitle}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn-action"
              onClick={() => setShowAddForm(true)}
              disabled={profileCount >= MAX_PROFILES}
              title={profileCount >= MAX_PROFILES ? `Max ${MAX_PROFILES} profiles` : undefined}
            >
              {strings.settings.addProfileBtn}
            </button>
          )}

          {/* Danger zone */}
          <div className="section-divider" />
          <h4 className="section-title danger-text">{strings.settings.dangerZoneTitle}</h4>
          <p className="settings-subtitle">{strings.settings.resetProfilesDesc}</p>

          {resetStep === 'none' && (
            <button type="button" className="btn-action danger" onClick={() => setResetStep('confirm')}>
              {strings.settings.resetProfilesBtn}
            </button>
          )}

          {resetStep === 'confirm' && (
            <div className="danger-panel">
              <p className="danger-panel-title">{strings.settings.resetConfirmTitle}</p>
              <p className="danger-panel-msg">{strings.settings.resetConfirmMsg}</p>
              <div className="modal-actions">
                <button type="button" className="btn-action" onClick={() => setResetStep('none')}>
                  {strings.settings.cancelBtn}
                </button>
                <button
                  type="button"
                  className="btn-action danger"
                  onClick={() => setResetStep('password')}
                >
                  {strings.profile.deleteBtn}
                </button>
              </div>
            </div>
          )}

          {resetStep === 'password' && (
            <div className="danger-panel">
              <p className="danger-panel-title">{strings.settings.resetPasswordTitle}</p>
              <p className="danger-panel-msg">{strings.settings.resetPasswordMsg}</p>
              <div className="form-group">
                <label className="form-label">{strings.auth.passwordLabel}</label>
                <input
                  className="form-input"
                  type="password"
                  value={resetPw}
                  onChange={e => setResetPw(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') execReset();
                  }}
                  autoComplete="current-password"
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-action"
                  onClick={() => {
                    setResetStep('none');
                    setResetPw('');
                  }}
                >
                  {strings.settings.cancelBtn}
                </button>
                <button type="button" className="btn-action danger" onClick={execReset} disabled={busy}>
                  {strings.profile.deleteBtn}
                </button>
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
                <button type="button" className="btn-action" onClick={() => setDeleting(null)}>
                  {strings.settings.cancelBtn}
                </button>
                <button type="button" className="btn-action danger" onClick={() => deleteProfile(deleting)} disabled={busy}>
                  {strings.profile.deleteBtn}
                </button>
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