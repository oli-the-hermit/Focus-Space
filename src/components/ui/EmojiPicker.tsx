import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IconClock, IconSearch } from './icons';
import { useUiLabels } from './UiLabels';
import { EMOJI_CATEGORIES, loadEmojiCatalog, sameEmoji, searchEmoji, type Emoji, type EmojiCatalog, type EmojiCategory } from '../../lib/emoji';

export interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  /** Emoji picked before, most recent first (the Recent tab). */
  recent: string[];
  /** Leave out flags (Windows has no flag emoji and shows letters instead). */
  hideFlags?: boolean;
  /** Emoji per row; arrow up/down moves by this many. */
  columns?: number;
}

type Tab = 'recent' | EmojiCategory;

/** Each category's tab shows one of its own emoji; Recent uses the clock icon. */
const TAB_GLYPHS: Record<EmojiCategory, string> = {
  smileys: '😀',
  animals: '🐻',
  food: '🍔',
  activities: '⚽',
  travel: '✈️',
  objects: '💡',
  symbols: '🔣',
  flags: '🏁'
};

/**
 * Search, category tabs and a grid of emoji. The catalog loads on first open (its own
 * chunk). From the search field, Enter picks the first match and arrow down enters the
 * grid; in the grid the arrow keys move, Home and End jump, Enter or Space picks.
 */
export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onPick, recent, hideFlags = false, columns = 8 }) => {
  const labels = useUiLabels();
  const [catalog, setCatalog] = useState<EmojiCatalog | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>(recent.length ? 'recent' : 'smileys');
  const [focusIndex, setFocusIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let alive = true;
    loadEmojiCatalog().then(c => alive && setCatalog(c)).catch(() => {});
    // A popover stays hidden while it measures itself, so focus the search a tick later.
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, []);

  const tabs: Tab[] = ['recent', ...EMOJI_CATEGORIES.filter(c => !(hideFlags && c === 'flags'))];
  const searching = query.trim() !== '';

  const items = useMemo((): Emoji[] => {
    if (!catalog) return [];
    if (searching) return searchEmoji(catalog.all, query, hideFlags ? e => e.category === 'flags' : undefined);
    if (tab === 'recent') {
      // Names come from the catalog; an emoji it doesn't know keeps its character as its name.
      return recent.map(char => catalog.all.find(e => sameEmoji(e.char, char)) ?? { char, label: char, category: 'symbols', terms: [] });
    }
    return catalog.byCategory[tab];
  }, [catalog, searching, query, hideFlags, tab, recent]);

  useEffect(() => setFocusIndex(0), [query, tab]);

  const title = searching ? labels.emojiResults : labels.emojiCategories[tab];
  const empty = !catalog ? labels.emojiLoading : searching ? labels.emojiNoResults : tab === 'recent' ? labels.emojiNoRecent : '';

  const focusCell = (i: number) => {
    setFocusIndex(i);
    cellRefs.current[i]?.focus();
  };

  const onGridKeyDown = (e: React.KeyboardEvent, i: number) => {
    const last = items.length - 1;
    const target =
      e.key === 'ArrowRight' ? i + 1
      : e.key === 'ArrowLeft' ? i - 1
      : e.key === 'ArrowDown' ? i + columns
      : e.key === 'ArrowUp' ? i - columns
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (target === null) return;
    e.preventDefault();
    if (target < 0) searchRef.current?.focus();
    else if (target <= last) focusCell(target);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      focusCell(0);
    } else if (e.key === 'Enter' && items.length) {
      e.preventDefault();
      onPick(items[0].char);
    }
  };

  return (
    <div className="emoji-picker" style={{ '--emoji-columns': columns } as React.CSSProperties}>
      <div className="select-search">
        <IconSearch size={15} />
        <input
          ref={searchRef}
          type="text"
          value={query}
          placeholder={labels.emojiSearch}
          aria-label={labels.emojiSearch}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onSearchKeyDown}
        />
      </div>

      <div className="emoji-tabs">
        {tabs.map(t => {
          const active = !searching && tab === t;
          return (
            <button
              key={t}
              type="button"
              className={`emoji-tab ${active ? 'is-active' : ''}`}
              aria-pressed={active}
              aria-label={labels.emojiCategories[t]}
              title={labels.emojiCategories[t]}
              onClick={() => {
                setTab(t);
                setQuery('');
                gridRef.current?.scrollTo({ top: 0 });
              }}
            >
              {t === 'recent' ? <IconClock size={17} /> : TAB_GLYPHS[t]}
            </button>
          );
        })}
      </div>

      <p className="emoji-section-title">{title}</p>
      <div className="emoji-grid" ref={gridRef} role="group" aria-label={title}>
        {items.length === 0 ? (
          <p className="emoji-empty">{empty}</p>
        ) : (
          items.map((e, i) => (
            <button
              key={e.char}
              ref={el => { cellRefs.current[i] = el; }}
              type="button"
              className="emoji-cell"
              aria-label={e.label}
              title={e.label}
              tabIndex={i === focusIndex ? 0 : -1}
              onClick={() => onPick(e.char)}
              onKeyDown={ev => onGridKeyDown(ev, i)}
            >
              {e.char}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
