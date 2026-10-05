import React from 'react';
import { cx } from '../../lib/cx';

export type ModalFormProps =
  | ({ as?: 'form' } & React.FormHTMLAttributes<HTMLFormElement>)
  | ({ as: 'div' } & React.HTMLAttributes<HTMLDivElement>);

/**
 * The column of fields inside a dialog (styles: components/form.css). A <form> by
 * default; `as="div"` when the dialog saves through its own buttons instead of submit.
 */
export const ModalForm: React.FC<ModalFormProps> = ({ as, className, ...rest }) => {
  const cls = cx('modal-form', className);
  if (as === 'div') return <div className={cls} {...(rest as React.HTMLAttributes<HTMLDivElement>)} />;
  return <form className={cls} {...(rest as React.FormHTMLAttributes<HTMLFormElement>)} />;
};

export interface FormRowProps {
  /** `emoji`: a narrow emoji button, then a wide field. Default: two equal columns. */
  variant?: 'pair' | 'emoji';
  /** Extra space above, to separate it from the field before. */
  spaced?: boolean;
  children: React.ReactNode;
}

/** Two fields side by side. */
export const FormRow: React.FC<FormRowProps> = ({ variant = 'pair', spaced = false, children }) => (
  <div className={cx('form-row', variant === 'emoji' && 'form-row--emoji', spaced && 'form-group-spaced')}>{children}</div>
);

/** Muted helper text in a form. */
export const FormHint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="form-hint">{children}</p>
);

/** A problem with what was entered, announced to screen readers. Say how to fix it. */
export const FormError: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="form-error" role="alert">{children}</p>
);

export interface SubformProps {
  title: React.ReactNode;
  /** A small action at the right of the title, e.g. a TextButton. */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** A form nested inside a field, on its own tinted panel (e.g. a new reward inside the session form). */
export const Subform: React.FC<SubformProps> = ({ title, action, children }) => (
  <div className="subform">
    <div className="subform-head">
      <span className="subform-title">{title}</span>
      {action}
    </div>
    {children}
  </div>
);
