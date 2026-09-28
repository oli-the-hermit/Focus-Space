import React, { useRef, useState } from 'react';
import { Popover } from './Popover';
import { IconMore } from './icons';
import { useUiLabels } from './UiLabels';

export interface MenuAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  /** Right-aligned hint, e.g. a keyboard shortcut. */
  hint?: string;
  onSelect: () => void;
}

export interface MenuDivider {
  key: string;
  divider: true;
}

export type MenuItem = MenuAction | MenuDivider;

export const isDivider = (item: MenuItem): item is MenuDivider => 'divider' in item;

/** Drops leading, trailing and doubled dividers left by conditional items. */
export function tidyMenuItems(items: (MenuItem | false | null | undefined)[]): MenuItem[] {
  const out: MenuItem[] = [];
  for (const item of items) {
    if (!item) continue;
    if (isDivider(item) && (out.length === 0 || isDivider(out[out.length - 1]))) continue;
    out.push(item);
  }
  while (out.length && isDivider(out[out.length - 1])) out.pop();
  return out;
}

/** Arrow keys / Home / End move focus between the menu's items. */
export function handleMenuKeyDown(e: React.KeyboardEvent<HTMLElement>) {
  const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
  if (!keys.includes(e.key)) return;
  e.preventDefault();
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLButtonElement>('.menu-item:not(:disabled)')
  );
  if (!items.length) return;
  const i = items.indexOf(e.target as HTMLButtonElement);
  const next =
    e.key === 'Home' ? 0
      : e.key === 'End' ? items.length - 1
        : e.key === 'ArrowDown' ? (i + 1) % items.length
          : (i - 1 + items.length) % items.length;
  items[next].focus();
}

/** The rows of a menu; shared by the overflow Menu and the right-click ContextMenu. */
export const MenuList: React.FC<{ items: MenuItem[]; onPicked: () => void }> = ({ items, onPicked }) => (
  <>
    {items.map(item =>
      isDivider(item) ? (
        <div key={item.key} className="menu-divider" role="separator" />
      ) : (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          className={`menu-item ${item.danger ? 'is-danger' : ''}`}
          disabled={item.disabled}
          onClick={() => {
            onPicked();
            item.onSelect();
          }}
        >
          <span className="menu-item-icon">{item.icon}</span>
          <span className="menu-item-label">{item.label}</span>
          {item.hint && <kbd className="menu-item-hint">{item.hint}</kbd>}
        </button>
      )
    )}
  </>
);

export interface MenuProps {
  items: MenuItem[];
  ariaLabel?: string;
  /** Custom trigger content; defaults to a vertical "more" glyph. */
  trigger?: React.ReactNode;
  triggerClassName?: string;
  align?: 'start' | 'end';
}

/** Overflow menu: an icon button that opens a list of actions. */
export const Menu: React.FC<MenuProps> = ({
  items,
  ariaLabel,
  trigger,
  triggerClassName = 'icon-btn',
  align = 'end'
}) => {
  const labels = useUiLabels();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${triggerClassName} ${open ? 'is-active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel ?? labels.moreActions}
        title={ariaLabel ?? labels.moreActions}
        onClick={e => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
      >
        {trigger || <IconMore size={18} />}
      </button>
      <Popover
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        onEscape={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        align={align}
        matchWidth={false}
        className="menu"
        role="menu"
      >
        <div onKeyDown={handleMenuKeyDown}>
          <MenuList items={items} onPicked={() => setOpen(false)} />
        </div>
      </Popover>
    </>
  );
};
