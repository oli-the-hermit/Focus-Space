import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary' }) => {
  return <span className={`chip ${variant === 'primary' ? 'chip--accent' : ''} badge-${variant}`}>{children}</span>;
};
