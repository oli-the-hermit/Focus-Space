import React, { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Popover } from './Popover';
import { IconButton } from './IconButton';
import { Button } from './Button';
import { TextInput } from './Field';
import { MenuList, handleMenuKeyDown, type MenuItem } from './Menu';
import { IconCheck, IconChevronDown, IconClose, IconPlus, IconSearch, IconSort } from './icons';
import { useUiLabels } from './UiLabels';
import { cx } from '../../lib/cx';
import { normalizeName, rankByMatch } from '../../lib/fuzzy';

export interface ListPickerItem {
  id: string;
  label: string;
  /** A second line, e.g. "7 tasks". */
  meta?: string;
}

export interface ListPickerSort {
  key: string;
  label: string;
  /** Without one, the items keep the order they came in (e.g. the user's own order). */
  compare?: (a: ListPickerItem, b: ListPickerItem) => number;
}

export interface ListPickerProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  title: string;
  items: ListPickerItem[];
  /** Shown in each item's tile. */
  icon: React.ReactNode;
  onPick: (id: string) => void;
  /** Ids used lately, newest first: the first 3 that match show on top under `label`. */
  recent?: { ids: string[]; label: string };
  /** The orders the sort button offers; the first is the default. */
  sorts?: ListPickerSort[];
  /** The fixed row at the bottom with an empty search, e.g. "New task list". */
  newLabel: string;
  /** The same row for a typed name nothing matches exactly, e.g. `Create "Errands"`. */
  createLabel: (name: string) => string;
  onCreate: (name: string) => void;
  /** Placeholder of the name field "New…" opens. */
  namePlaceholder: string;
  /** Names offered while there are no items at all. */
  suggestions?: { names: string[]; label: string };
}

type Row = { kind: 'item'; item: ListPickerItem } | { kind: 'suggestion'; name: string };

const RECENT_MAX = 3;

/**
 * Pick an item from a long list or create one (styles: components/list-picker.css): a title
 * with sort and close, a search that matches loosely, the recently used items on top, a
 * scrollable list that keeps its size, and a create row fixed at the bottom. Arrow keys move
 * through the rows from the search field; Enter picks; Escape steps back (sort, naming, close).
 */
export const ListPicker: React.FC<ListPickerProps> = ({
  open,
  onClose,
  anchorRef,
  title,
  items,
  icon,
  onPick,
  recent,
  sorts = [],
  newLabel,
  createLabel,
  onCreate,
  namePlaceholder,
  suggestions
}) => {
  const labels = useUiLabels();
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(sorts[0]?.key);
  const [sortOpen, setSortOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [highlight, setHighlight] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const sortWrapRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Each opening starts fresh: empty search, top row, the default order kept.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSortOpen(false);
    setNaming(false);
    setDraftName('');
    setHighlight(0);
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (naming) nameRef.current?.focus();
  }, [naming]);

  const q = query.trim();
  const { rows, recentCount } = useMemo(() => {
    if (items.length === 0 && !q && suggestions?.names.length) {
      return { rows: suggestions.names.map((name): Row => ({ kind: 'suggestion', name })), recentCount: 0 };
    }
    const sort = sorts.find(s => s.key === sortKey);
    const ordered = sort?.compare ? [...items].sort(sort.compare) : items;
    const matches = rankByMatch(ordered, q, i => i.label);
    const top = (recent?.ids ?? [])
      .map(id => matches.find(m => m.id === id))
      .filter((m): m is ListPickerItem => !!m)
      .slice(0, RECENT_MAX);
    const rest = matches.filter(m => !top.includes(m));
    return { rows: [...top, ...rest].map((item): Row => ({ kind: 'item', item })), recentCount: top.length };
  }, [items, q, sorts, sortKey, recent, suggestions]);

  const showingSuggestions = rows[0]?.kind === 'suggestion';
  const exact = items.some(i => normalizeName(i.label) === normalizeName(q));
  const createName = q && !exact ? q : null;
  const createIndex = rows.length;

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const pick = (id: string) => {
    onPick(id);
    onClose();
  };
  const create = (name: string) => {
    onCreate(name);
    onClose();
  };
  const activate = (index: number) => {
    if (index === createIndex) {
      if (createName) create(createName);
      else setNaming(true);
      return;
    }
    const row = rows[index];
    if (row?.kind === 'item') pick(row.item.id);
    else if (row) create(row.name);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    const count = rows.length + 1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => (h + (e.key === 'ArrowDown' ? 1 : -1) + count) % count);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      activate(highlight);
    }
  };

  const sortItems: MenuItem[] = sorts.map(s => ({
    key: s.key,
    label: s.label,
    icon: s.key === sortKey ? <IconCheck size={15} strokeWidth={2.6} /> : undefined,
    onSelect: () => setSortKey(s.key)
  }));

  const rowLabel = (row: Row) => (row.kind === 'item' ? row.item.label : row.name);

  return (
    <Popover
      open={open}
      anchorRef={anchorRef}
      onClose={onClose}
      onEscape={() => (sortOpen ? setSortOpen(false) : naming ? setNaming(false) : onClose())}
      className="list-picker"
      role="dialog"
      ariaLabel={title}
    >
      {/* A click anywhere else in the picker closes the sort menu. */}
      <div
        className="list-picker-body"
        onMouseDown={e => sortOpen && !sortWrapRef.current?.contains(e.target as Node) && setSortOpen(false)}
      >
        <div className="list-picker-head">
          <h3 className="list-picker-title">{title}</h3>
          {sorts.length > 1 && (
            <div className="list-picker-sort-wrap" ref={sortWrapRef}>
              <IconButton
                label={labels.sort}
                size="sm"
                surface={3}
                active={sortOpen}
                aria-haspopup="menu"
                aria-expanded={sortOpen}
                onClick={() => setSortOpen(o => !o)}
              >
                <IconSort size={17} />
              </IconButton>
              {sortOpen && (
                <div className="menu list-picker-sort" role="menu" aria-label={labels.sort} onKeyDown={handleMenuKeyDown}>
                  <MenuList items={sortItems} onPicked={() => setSortOpen(false)} />
                </div>
              )}
            </div>
          )}
          <IconButton label={labels.close} size="sm" surface={3} onClick={onClose}>
            <IconClose size={16} />
          </IconButton>
        </div>

        <div className="list-picker-search">
          <IconSearch size={15} />
          <input
            ref={searchRef}
            type="text"
            value={query}
            placeholder={labels.search}
            aria-label={labels.searchOptions}
            aria-controls={listboxId}
            aria-activedescendant={`${listboxId}-${highlight}`}
            onChange={e => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={onSearchKeyDown}
          />
        </div>

        <div className="list-picker-list">
          <ul ref={listRef} id={listboxId} role="listbox" aria-label={title}>
            {(showingSuggestions || recentCount > 0) && (
              <li role="presentation" className="list-picker-group">
                {showingSuggestions ? suggestions?.label : recent?.label}
              </li>
            )}
            {rows.map((row, index) => (
              <React.Fragment key={row.kind === 'item' ? row.item.id : `s:${row.name}`}>
                {index === recentCount && recentCount > 0 && <li role="separator" className="list-picker-separator" />}
                <li role="presentation">
                  <button
                    type="button"
                    role="option"
                    id={`${listboxId}-${index}`}
                    tabIndex={-1}
                    data-index={index}
                    aria-selected={index === highlight}
                    className={cx('list-picker-row', index === highlight && 'is-highlighted')}
                    onClick={() => activate(index)}
                    onMouseEnter={() => setHighlight(index)}
                  >
                    <span className="list-picker-tile" aria-hidden="true">
                      {row.kind === 'item' ? icon : <IconPlus size={16} strokeWidth={2.4} />}
                    </span>
                    <span className="list-picker-text">
                      <span className="list-picker-name">{rowLabel(row)}</span>
                      {row.kind === 'item' && row.item.meta && <span className="list-picker-meta">{row.item.meta}</span>}
                    </span>
                  </button>
                </li>
              </React.Fragment>
            ))}
            {rows.length === 0 && <li role="presentation" className="list-picker-empty">{labels.noMatches}</li>}
          </ul>
        </div>

        <div className="list-picker-foot">
          {naming ? (
            <form
              className="list-picker-name-form"
              onSubmit={e => {
                e.preventDefault();
                if (draftName.trim()) create(draftName.trim());
              }}
            >
              <TextInput
                ref={nameRef}
                value={draftName}
                placeholder={namePlaceholder}
                aria-label={namePlaceholder}
                onChange={e => setDraftName(e.target.value)}
              />
              <Button variant="primary" size="sm" type="submit" disabled={!draftName.trim()}>
                {labels.create}
              </Button>
            </form>
          ) : (
            <button
              type="button"
              id={`${listboxId}-${createIndex}`}
              className={cx('list-picker-row list-picker-create', highlight === createIndex && 'is-highlighted')}
              onClick={() => activate(createIndex)}
              onMouseEnter={() => setHighlight(createIndex)}
            >
              <span className="list-picker-tile" aria-hidden="true"><IconPlus size={18} strokeWidth={2.4} /></span>
              <span className="list-picker-name">{createName ? createLabel(createName) : newLabel}</span>
            </button>
          )}
        </div>
      </div>
    </Popover>
  );
};

export interface ListPickerTriggerProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** `add`: an accent "+ Add another…" row. `field`: looks like a form field with a placeholder. */
  look?: 'add' | 'field';
  label: string;
  icon?: React.ReactNode;
  open: boolean;
}

/** The button a ListPicker opens from (anchor it with the forwarded ref). */
export const ListPickerTrigger = forwardRef<HTMLButtonElement, ListPickerTriggerProps>(
  ({ look = 'field', label, icon, open, className, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cx('list-picker-trigger', `list-picker-trigger--${look}`, open && 'is-open', className)}
      aria-haspopup="dialog"
      aria-expanded={open}
      {...rest}
    >
      {icon && <span className="list-picker-trigger-icon">{icon}</span>}
      <span className="list-picker-trigger-label">{label}</span>
      <span className="list-picker-trigger-chevron" aria-hidden="true"><IconChevronDown size={16} /></span>
    </button>
  )
);
ListPickerTrigger.displayName = 'ListPickerTrigger';
