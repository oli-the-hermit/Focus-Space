import React from 'react';

export interface FilterTabOption {
  key: string;
  label: string;
}

export interface FilterGridLayoutProps {
  tabs: FilterTabOption[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  actionButton?: React.ReactNode;
  headerSlot?: React.ReactNode;
  children: React.ReactNode;
  emptyMessage?: string;
  hasItems?: boolean;
}

export const FilterGridLayout: React.FC<FilterGridLayoutProps> = ({
  tabs,
  activeTab,
  onTabChange,
  actionButton,
  headerSlot,
  children,
  emptyMessage = 'No items found.',
  hasItems = true
}) => {
  return (
    <div className="filter-grid-layout">
      {headerSlot && <div className="filter-grid-header-slot">{headerSlot}</div>}

      <div className="filter-grid-topbar">
        <div className="filter-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              className={`filter-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => onTabChange(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {actionButton && <div className="filter-grid-actions">{actionButton}</div>}
      </div>

      <div className="filter-grid-body">
        {!hasItems ? (
          <div className="empty-state">{emptyMessage}</div>
        ) : (
          <div className="cards-grid">{children}</div>
        )}
      </div>
    </div>
  );
};
