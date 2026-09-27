import React from 'react';
import { strings } from '../../constants/strings';

export interface FormActionsProps {
  /** The form differs from what it opened with. */
  dirty: boolean;
  /** Shown only while dirty. Defaults to "Cancel". */
  cancelLabel?: string;
  onCancel: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  /** Omit for a submit button inside a <form>. */
  onPrimary?: () => void;
  /** Extra content on the left (e.g. a destructive action). */
  leading?: React.ReactNode;
}

/**
 * The footer every form modal shares: the primary action on the right, and a
 * Cancel / Discard button that only appears once something was edited.
 * Untouched forms close with the X.
 */
export const FormActions: React.FC<FormActionsProps> = ({
  dirty,
  cancelLabel = strings.common.cancel,
  onCancel,
  primaryLabel,
  primaryDisabled,
  onPrimary,
  leading
}) => (
  <div className="modal-actions form-actions">
    {leading && <div className="form-actions-leading">{leading}</div>}
    {dirty && (
      <button type="button" className="btn-action form-actions-cancel" onClick={onCancel}>
        {cancelLabel}
      </button>
    )}
    <button
      type={onPrimary ? 'button' : 'submit'}
      className="btn-action primary"
      disabled={primaryDisabled}
      onClick={onPrimary}
    >
      {primaryLabel}
    </button>
  </div>
);
