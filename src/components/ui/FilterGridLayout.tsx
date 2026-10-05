import React from 'react';
import { useUiLabels } from './UiLabels';
import { EmptyState } from './EmptyState';
import { SegmentedControl } from './SegmentedControl';
import { GridItem, LayoutGrid, type GridSpan } from './LayoutGrid';

/** A card per row on phones, two from md, three from xl, four on very wide screens. */
const CARD_SPAN: GridSpan = { base: 12, md: 6, xl: 4, '3xl': 3 };

export interface FilterTabOption {
  key: string;
  label: string;
}

export interface FilterGridLayoutProps {
  tabs: FilterTabOption[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  /** Accessible name of the tabs, e.g. "Show goals by frequency". */
  tabsLabel: string;
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
  tabsLabel,
  actionButton,
  headerSlot,
  children,
  emptyMessage,
  hasItems = true
}) => {
  const labels = useUiLabels();
  return (
    <div className="filter-grid-layout">
      {headerSlot && <div className="filter-grid-header-slot">{headerSlot}</div>}

      <div className="filter-grid-topbar">
        <SegmentedControl
          options={tabs.map(t => ({ value: t.key, label: t.label }))}
          value={activeTab}
          onChange={onTabChange}
          ariaLabel={tabsLabel}
        />

        {actionButton && <div className="filter-grid-actions">{actionButton}</div>}
      </div>

      <div className="filter-grid-body">
        {!hasItems ? (
          <EmptyState>{emptyMessage ?? labels.noItems}</EmptyState>
        ) : (
          <LayoutGrid>
            {React.Children.map(children, child => <GridItem span={CARD_SPAN}>{child}</GridItem>)}
          </LayoutGrid>
        )}
      </div>
    </div>
  );
};
