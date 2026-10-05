import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { Menu, type MenuItem } from '../ui/Menu';
import { IconLogOut, IconPalette, IconSettings, IconUser } from '../ui/icons';
import { initials } from '../../lib/formatUtils';
import type { UserMenuView } from './UserMenuModal';

export interface UserBadgeProps {
  onOpen: (view: UserMenuView) => void;
  /** Avatar only (for the navigation rail). */
  compact?: boolean;
}

const VIEW_ITEMS: { view: UserMenuView; label: string; icon: React.ReactNode }[] = [
  { view: 'profile', label: strings.userMenu.profile, icon: <IconUser /> },
  { view: 'appearance', label: strings.userMenu.appearance, icon: <IconPalette /> },
  { view: 'settings', label: strings.userMenu.settings, icon: <IconSettings /> }
];

/** The signed-in profile: avatar (and name) that opens the account menu. */
export const UserBadge: React.FC<UserBadgeProps> = ({ onOpen, compact = false }) => {
  const { profile, logout } = useApp();
  const [busy, setBusy] = useState(false);

  if (!profile) return null;

  const handleExit = async () => {
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
    }
  };

  const items: MenuItem[] = [
    ...VIEW_ITEMS.map(item => ({ key: item.view, label: item.label, icon: item.icon, onSelect: () => onOpen(item.view) })),
    { key: 'exit', label: strings.userMenu.exit, icon: <IconLogOut />, danger: true, disabled: busy, onSelect: handleExit }
  ];

  return (
    <div className={`user-badge ${compact ? 'is-compact' : ''}`}>
      <Menu
        items={items}
        ariaLabel={profile.displayName}
        triggerClassName="user-badge-btn"
        align="start"
        menuClassName="user-menu"
        header={
          <div className="user-menu-head">
            <span className="user-menu-name">{profile.displayName}</span>
            <span className="user-menu-handle">@{profile.username}</span>
          </div>
        }
        trigger={
          <>
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
          </>
        }
      />
    </div>
  );
};
