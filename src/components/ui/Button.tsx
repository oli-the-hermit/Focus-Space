import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const isIcon = variant === 'icon';
  const baseClass = isIcon ? `icon-btn ${size}` : `btn-action ${variant}`;
  return (
    <button className={`${baseClass} ${className}`} {...props}>
      {children}
    </button>
  );
};
