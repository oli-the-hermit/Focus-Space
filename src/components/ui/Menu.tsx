import React, { useRef, useState } from 'react';
import { Popover } from './Popover';
import { IconMore } from './icons';

export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

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
  ariaLabel = 'More actions',
  trigger,
  triggerClassName = 'icon-btn',
  align = 'end'
}) => {
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
        aria-label={ariaLabel}
        title={ariaLabel}
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
        {items.map(item => (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            className={`menu-item ${item.danger ? 'is-danger' : ''}`}
            onClick={() => {
              setOpen(false);
              item.onSelect();
            }}
          >
            {item.icon && <span className="menu-item-icon">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </Popover>
    </>
  );
};
