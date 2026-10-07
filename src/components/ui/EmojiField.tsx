import React, { useRef, useState } from 'react';
import { Popover } from './Popover';
import { EmojiPicker } from './EmojiPicker';

export interface EmojiFieldProps {
  value: string;
  onChange: (emoji: string) => void;
  /** Emoji picked before, newest first (the picker's Recent tab). */
  recent: string[];
  /** Hide the Flags tab where the platform can't draw flag emoji. */
  hideFlags?: boolean;
  /** Screen-reader name of the button, e.g. "Emoji: ☕. Pick another". */
  buttonLabel: string;
  /** Tooltip, and the picker dialog's name, e.g. "Pick an emoji". */
  pickLabel: string;
  id?: string;
}

/**
 * A field-sized button showing the chosen emoji; it opens the emoji picker in a popover
 * (styles: components/form.css .emoji-input, components/emoji-picker.css).
 */
export const EmojiField: React.FC<EmojiFieldProps> = ({ value, onChange, recent, hideFlags = false, buttonLabel, pickLabel, id }) => {
  const [open, setOpen] = useState(false);
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
        aria-label={buttonLabel}
        title={pickLabel}
        onClick={() => setOpen(o => !o)}
      >
        {value}
      </button>
      <Popover open={open} anchorRef={buttonRef} onClose={close} matchWidth={false} role="dialog" ariaLabel={pickLabel}>
        <EmojiPicker
          recent={recent}
          hideFlags={hideFlags}
          onPick={emoji => {
            onChange(emoji);
            close();
          }}
        />
      </Popover>
    </>
  );
};
