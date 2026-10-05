import React, { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cx } from '../../lib/cx';

const SIZES_ITSELF = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content');

export interface InlineTextAreaProps {
  /** The saved text. */
  value: string;
  /** Called on blur when the text changed (trimmed). */
  onSave: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  maxLength?: number;
  className?: string;
}

/**
 * Text you edit where it's shown: looks like plain text until hovered or focused,
 * grows with its content, saves when it loses focus, and Escape puts back the saved
 * text (styles: components/form.css, .inline-textarea).
 */
export const InlineTextArea = forwardRef<HTMLTextAreaElement, InlineTextAreaProps>(
  ({ value, onSave, placeholder, ariaLabel, maxLength, className }, forwarded) => {
    const [draft, setDraft] = useState(value);
    const ref = useRef<HTMLTextAreaElement | null>(null);
    const reverting = useRef(false);

    // A save from elsewhere (the edit dialog) replaces the draft while it isn't being edited.
    useEffect(() => {
      if (document.activeElement !== ref.current) setDraft(value);
    }, [value]);

    // Grow with the text where CSS can't (field-sizing: content). A hidden page measures 0,
    // so skip until it's laid out rather than collapsing the field.
    useLayoutEffect(() => {
      const el = ref.current;
      if (!el || SIZES_ITSELF) return;
      el.style.height = 'auto';
      if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`;
    }, [draft]);

    const commit = () => {
      // Escape already put the saved text back; the blur that follows saves nothing.
      if (reverting.current) {
        reverting.current = false;
        return;
      }
      const next = draft.trim();
      if (next !== draft) setDraft(next);
      if (next !== value) onSave(next);
    };

    return (
      <textarea
        ref={el => {
          ref.current = el;
          if (typeof forwarded === 'function') forwarded(el);
          else if (forwarded) forwarded.current = el;
        }}
        className={cx('inline-textarea', className)}
        rows={1}
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        maxLength={maxLength}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            reverting.current = true;
            setDraft(value);
            e.currentTarget.blur();
          }
        }}
      />
    );
  }
);
InlineTextArea.displayName = 'InlineTextArea';
