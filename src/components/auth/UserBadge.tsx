import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { Popover } from '../ui/Popover';
import { IconLogOut, IconSettings, IconUser } from '../ui/icons';
import { initials } from '../../lib/formatUtils';

export interface UserBadgeProps {
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  /** Avatar only (for the navigation rail). */
  compact?: boolean;
}

export const UserBadge: React.FC<UserBadgeProps> = ({ onOpenProfile, onOpenSettings, compact = false }) => {
  const { profile, logout } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    <div className={`user-badge ${compact ? 'is-compact' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className="user-badge-btn"
        onClick={() => setOpen(o => !o)}
        title={profile.displayName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={profile.displayName}
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
        {!compact && <span className="user-badge-name">{profile.displayName}</span>}
      </button>

      <Popover
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        matchWidth={false}
        className="menu user-menu"
        role="menu"
      >
        <div className="user-menu-head">
          <span className="user-menu-name">{profile.displayName}</span>
          <span className="user-menu-handle">@{profile.username}</span>
        </div>
        <button
          type="button"
          className="menu-item"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onOpenProfile();
          }}
        >
          <span className="menu-item-icon"><IconUser /></span>
          {strings.userMenu.profile}
        </button>
        <button
          type="button"
          className="menu-item"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            onOpenSettings();
          }}
        >
          <span className="menu-item-icon"><IconSettings /></span>
          {strings.userMenu.settings}
        </button>
        <button
          type="button"
          className="menu-item is-danger"
          role="menuitem"
          onClick={handleExit}
          disabled={busy}
        >
          <span className="menu-item-icon"><IconLogOut /></span>
          {strings.userMenu.exit}
        </button>
      </Popover>
    </div>
  );
};
