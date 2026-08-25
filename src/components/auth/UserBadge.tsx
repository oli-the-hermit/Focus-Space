import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';

export interface UserBadgeProps {
  onOpenProfile: () => void;
  onOpenSettings: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export const UserBadge: React.FC<UserBadgeProps> = ({ onOpenProfile, onOpenSettings }) => {
  const { profile, logout } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!profile) return null;

  const handleExit = async () => {
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="user-badge" ref={rootRef}>
      <button
        type="button"
        className="user-badge-btn"
        onClick={() => setOpen(o => !o)}
        title={profile.displayName}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="user-avatar">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="user-avatar-img" />
          ) : (
            <span className="user-avatar-initials">{initials(profile.displayName)}</span>
          )}
          {profile.role === 'owner' && (
            <span className="user-role-dot" title={strings.auth.mainAccountTooltip} />
          )}
        </span>
        <span className="user-badge-name">{profile.displayName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
        </svg>
      </button>

      {open && (
        <div className="user-dropdown" role="menu">
          <button
            type="button"
            className="user-dropdown-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenProfile();
            }}
          >
            <span className="user-dropdown-icon">👤</span>
            {strings.userMenu.profile}
          </button>
          <button
            type="button"
            className="user-dropdown-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
          >
            <span className="user-dropdown-icon">⚙️</span>
            {strings.userMenu.settings}
          </button>
          <div className="user-dropdown-sep" />
          <button
            type="button"
            className="user-dropdown-item danger"
            role="menuitem"
            onClick={handleExit}
            disabled={busy}
          >
            <span className="user-dropdown-icon">🚪</span>
            {strings.userMenu.exit}
          </button>
        </div>
      )}
    </div>
  );
};