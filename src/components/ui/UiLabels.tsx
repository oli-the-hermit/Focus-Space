import React, { createContext, useContext, useMemo } from 'react';

/**
 * The UI primitives' own words (screen-reader names, placeholders, tooltips).
 * This is their single source; the primitives never import app strings.
 * Wrap the app in <UiLabelsProvider labels={…}> to translate or override any of them.
 */
export const defaultUiLabels = {
  close: 'Close',
  cancel: 'Cancel',
  copy: 'Copy',
  actions: 'Actions',
  moreActions: 'More actions',
  selectPlaceholder: 'Select an option',
  options: 'Options',
  search: 'Search…',
  searchOptions: 'Search options',
  noMatches: 'No matches',
  noItems: 'No items found.',
  create: 'Create',
  newItemName: 'Name',
  clearDate: 'Clear date',
  clear: 'Clear',
  today: 'Today',
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  chooseTime: 'Choose time',
  timePlaceholder: 'HH:MM',
  decrease: 'Decrease',
  increase: 'Increase'
};

export type UiLabels = typeof defaultUiLabels;

const UiLabelsContext = createContext<UiLabels>(defaultUiLabels);

export const UiLabelsProvider: React.FC<{ labels: Partial<UiLabels>; children: React.ReactNode }> = ({ labels, children }) => {
  const value = useMemo(() => ({ ...defaultUiLabels, ...labels }), [labels]);
  return <UiLabelsContext.Provider value={value}>{children}</UiLabelsContext.Provider>;
};

export const useUiLabels = (): UiLabels => useContext(UiLabelsContext);
