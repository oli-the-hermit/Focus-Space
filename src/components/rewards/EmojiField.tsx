import React, { useRef, useState } from 'react';
import { strings } from '../../constants/strings';
import { format } from '../../lib/i18n';
import { hasFlagEmoji } from '../../lib/platform';
import { loadRecentEmoji, pushRecentEmoji } from '../../lib/storage';
import { Popover } from '../ui/Popover';
import { EmojiPicker } from '../ui/EmojiPicker';

export interface EmojiFieldProps {
  value: string;
  onChange: (emoji: string) => void;
  id?: string;
}

/** A field-sized button showing the reward's emoji; it opens the emoji picker. */
export const EmojiField: React.FC<EmojiFieldProps> = ({ value, onChange, id }) => {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState(loadRecentEmoji);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className="form-input emoji-input emoji-field"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={format(strings.modals.emojiButtonAria, { emoji: value })}
        title={strings.modals.emojiPick}
        onClick={() => setOpen(o => !o)}
      >
        {value}
      </button>
      <Popover
        open={open}
        anchorRef={buttonRef}
        onClose={close}
        matchWidth={false}
        role="dialog"
        ariaLabel={strings.modals.emojiPick}
      >
        <EmojiPicker
          recent={recent}
          hideFlags={!hasFlagEmoji()}
          onPick={emoji => {
            onChange(emoji);
            setRecent(pushRecentEmoji(emoji));
            close();
          }}
        />
      </Popover>
    </>
  );
};
