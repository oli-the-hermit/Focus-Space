import React from 'react';
import { cx } from '../../lib/cx';

export interface ActionRowProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * The buttons that close a dialog or an inline confirm panel, right-aligned with the
 * primary action last (styles: components/modal.css, .modal-actions).
 */
export const ActionRow: React.FC<ActionRowProps> = ({ className, children }) => (
  <div className={cx('modal-actions', className)}>{children}</div>
);
