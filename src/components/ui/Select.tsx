import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { IconChevronDown, IconCheck, IconPlus, IconSearch } from './icons';
import { Popover } from './Popover';
import { useUiLabels } from './UiLabels';

export interface SelectOption<T = string> {
  value: T;
  label: React.ReactNode;
  /** Secondary text shown right-aligned in the row (e.g. "3 left"). */
  meta?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Plain text used for search when `label` is not a string. */
  searchText?: string;
}

export interface SelectCreateOption<T = string> {
  label: string;
  placeholder?: string;
  /** Return a value to have it selected through `onChange`; return nothing to handle selection yourself. */
  onCreate: (name: string) => T | void;
}

export interface SelectProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  ariaLabel?: string;
  /**
   * `field` for forms, `header` for a large title-style trigger, `add` for an
   * "Add another…" row (accent text; give it an `icon` and a `placeholder`).
   */
  variant?: 'field' | 'header' | 'add';
  /** Icon at the start of the trigger, shown instead of the selected option's own. */
  icon?: React.ReactNode;
  createOption?: SelectCreateOption<T>;
  /** Defaults to on when there are more than 8 options. */
  searchable?: boolean;
}

const SEARCH_THRESHOLD = 8;

function optionText<T>(opt: SelectOption<T>): string {
  if (opt.searchText) return opt.searchText;
  return typeof opt.label === 'string' || typeof opt.label === 'number' ? String(opt.label) : '';
}

export const Select = <T extends string | number>({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  id,
  name,
  className = '',
  ariaLabel,
  variant = 'field',
  icon,
  createOption,
  searchable
}: SelectProps<T>): React.ReactElement => {
  const labels = useUiLabels();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState('');

  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const autoId = useId();
  const selectId = id || autoId;
  const listboxId = `${selectId}-listbox`;

  const showSearch = searchable ?? options.length > SEARCH_THRESHOLD;

  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => optionText(o).toLowerCase().includes(q));
  }, [options, query]);

  // The create row is a virtual last item for keyboard navigation.
  const itemCount = visibleOptions.length + (createOption ? 1 : 0);
  const createIndex = createOption ? visibleOptions.length : -1;

  const selectedOption = options.find(opt => opt.value === value);

  const close = () => {
    setIsOpen(false);
    setIsCreating(false);
    setDraftName('');
    setQuery('');
    setHighlightedIndex(-1);
  };

  const open = () => {
    if (disabled || isOpen) return;
    setIsOpen(true);
    const idx = options.findIndex(opt => opt.value === value);
    setHighlightedIndex(idx >= 0 ? idx : 0);
  };

  const selectValue = (optValue: T) => {
    onChange(optValue);
    close();
    triggerRef.current?.focus();
  };

  const startCreate = () => {
    setIsCreating(true);
    setDraftName(query.trim());
  };

  const commitCreate = () => {
    const nameVal = draftName.trim();
    if (!nameVal || !createOption) return;
    const created = createOption.onCreate(nameVal);
    if (created !== undefined && created !== null) onChange(created as T);
    close();
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => {
      if (isCreating) createInputRef.current?.focus();
      else if (showSearch) searchRef.current?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [isOpen, isCreating, showSearch]);

  // Keep the highlighted row in view while navigating with the keyboard.
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  const moveHighlight = (dir: 1 | -1) => {
    if (itemCount === 0) return;
    let next = highlightedIndex;
    for (let i = 0; i < itemCount; i++) {
      next = (next + dir + itemCount) % itemCount;
      if (next === createIndex || !visibleOptions[next]?.disabled) break;
    }
    setHighlightedIndex(next);
  };

  const handleNavKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        open();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveHighlight(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveHighlight(-1);
        break;
      case 'Enter': {
        e.preventDefault();
        if (highlightedIndex === createIndex) {
          startCreate();
        } else {
          const opt = visibleOptions[highlightedIndex];
          if (opt && !opt.disabled) selectValue(opt.value);
        }
        break;
      }
      case ' ':
        // Space types into the search box; on the trigger it selects.
        if (e.target === triggerRef.current) {
          e.preventDefault();
          const opt = visibleOptions[highlightedIndex];
          if (highlightedIndex === createIndex) startCreate();
          else if (opt && !opt.disabled) selectValue(opt.value);
        }
        break;
      case 'Tab':
        close();
        break;
    }
  };

  const triggerIcon = icon ?? selectedOption?.icon;
  const triggerContent = (
    <>
      {triggerIcon && <span className="select-option-icon">{triggerIcon}</span>}
      <span className={`select-value ${selectedOption ? '' : 'is-placeholder'}`}>
        {selectedOption ? selectedOption.label : placeholder ?? labels.selectPlaceholder}
      </span>
    </>
  );

  return (
    <div className={`select select--${variant} ${isOpen ? 'is-open' : ''} ${className}`}>
      {name && (
        <input type="hidden" name={name} value={value !== undefined && value !== null ? String(value) : ''} />
      )}

      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleNavKeyDown}
      >
        {triggerContent}
        <span className="select-chevron" aria-hidden="true">
          <IconChevronDown size={variant === 'header' ? 18 : 16} />
        </span>
      </button>

      <Popover
        open={isOpen}
        anchorRef={triggerRef}
        onClose={close}
        onEscape={() => {
          if (isCreating) {
            setIsCreating(false);
            setDraftName('');
          } else {
            close();
            triggerRef.current?.focus();
          }
        }}
        className="select-menu"
      >
        {showSearch && !isCreating && (
          <div className="select-search">
            <IconSearch size={15} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              placeholder={labels.search}
              onChange={e => {
                setQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleNavKeyDown}
              aria-label={labels.searchOptions}
            />
          </div>
        )}

        <ul ref={listRef} id={listboxId} role="listbox" aria-label={ariaLabel || labels.options} className="select-options">
          {visibleOptions.length === 0 && !createOption && (
            <li className="select-empty">{labels.noMatches}</li>
          )}
          {visibleOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === highlightedIndex;
            return (
              <li key={String(option.value)} role="presentation">
                <button
                  type="button"
                  role="option"
                  tabIndex={-1}
                  data-index={index}
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  disabled={option.disabled}
                  className={`select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`}
                  onClick={() => !option.disabled && selectValue(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="select-option-check" aria-hidden="true">
                    {isSelected && <IconCheck size={15} strokeWidth={2.6} />}
                  </span>
                  {option.icon && <span className="select-option-icon">{option.icon}</span>}
                  <span className="select-option-label">{option.label}</span>
                  {option.meta && <span className="select-option-meta">{option.meta}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {createOption && (
          <div className="select-create">
            {isCreating ? (
              <div className="select-create-form">
                <input
                  ref={createInputRef}
                  type="text"
                  value={draftName}
                  placeholder={createOption.placeholder || labels.newItemName}
                  onChange={e => setDraftName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      commitCreate();
                    }
                  }}
                  aria-label={createOption.label}
                />
                <button
                  type="button"
                  className="select-create-confirm"
                  onClick={commitCreate}
                  disabled={!draftName.trim()}
                  aria-label={labels.create}
                >
                  <IconCheck size={16} strokeWidth={2.6} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                tabIndex={-1}
                data-index={createIndex}
                className={`select-create-btn ${highlightedIndex === createIndex ? 'is-highlighted' : ''}`}
                onClick={startCreate}
                onMouseEnter={() => setHighlightedIndex(createIndex)}
              >
                <IconPlus size={16} strokeWidth={2.4} />
                {createOption.label}
              </button>
            )}
          </div>
        )}
      </Popover>
    </div>
  );
};
