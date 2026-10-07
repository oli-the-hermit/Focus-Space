import React, { useRef } from 'react';
import { cx } from '../../lib/cx';
import { IconEdit, IconTrash } from './icons';

export interface AvatarPickerProps {
  /** The current photo (any image URL); without one the fallback shows. */
  src?: string;
  /** Shown without a photo, e.g. initials. */
  fallback: React.ReactNode;
  /** A file the user picked (not yet checked or resized). */
  onPick: (file: File | undefined) => void;
  /** Shows the remove button while there's a photo. */
  onRemove?: () => void;
  editLabel: string;
  removeLabel: string;
  className?: string;
}

/**
 * A round photo with an edit button over it (always shown without a photo, on hover or
 * focus over one) and a remove button at its corner (styles: components/avatar-picker.css).
 */
export const AvatarPicker: React.FC<AvatarPickerProps> = ({ src, fallback, onPick, onRemove, editLabel, removeLabel, className }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className={cx('avatar-picker', src && 'has-photo', className)}>
      <span className="avatar-picker-img" aria-hidden="true">
        {src ? <img src={src} alt="" /> : fallback}
      </span>
      <button
        type="button"
        className="avatar-picker-edit"
        onClick={() => fileRef.current?.click()}
        aria-label={editLabel}
        title={editLabel}
      >
        <IconEdit size={18} />
      </button>
      {src && onRemove && (
        <button type="button" className="avatar-picker-remove" onClick={onRemove} aria-label={removeLabel} title={removeLabel}>
          <IconTrash size={14} />
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          onPick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
};
