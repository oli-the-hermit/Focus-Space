import React from 'react';

export interface TwoColumnLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
  secondarySidebar?: React.ReactNode;
  className?: string;
}

export const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({
  sidebar,
  content,
  secondarySidebar,
  className = ''
}) => {
  if (secondarySidebar) {
    return (
      <div className={`master-three-column-layout ${className}`}>
        <aside className="layout-sidebar-left">{sidebar}</aside>
        <main className="layout-content-main">{content}</main>
        <aside className="layout-sidebar-right">{secondarySidebar}</aside>
      </div>
    );
  }

  return (
    <div className={`master-two-column-layout ${className}`}>
      <aside className="layout-sidebar-left">{sidebar}</aside>
      <main className="layout-content-main">{content}</main>
    </div>
  );
};
