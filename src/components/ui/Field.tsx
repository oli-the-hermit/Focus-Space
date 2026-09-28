import React, { forwardRef, useId } from 'react';
import { cx } from '../../lib/cx';

export interface FieldProps {
  label: React.ReactNode;
  /** Small muted text after the label, e.g. "Optional". */
  labelHint?: React.ReactNode;
  /**
   * Id of the control the label points at. When omitted and the only child is a
   * TextInput or TextArea without an id, Field generates and wires one.
   */
  htmlFor?: string;
  /** The label names a group of controls (chips, options): rendered as text, not a <label>. */
  group?: boolean;
  /** Extra space above, to separate it from the field before. */
  spaced?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label + control stack used by every form (styles: components/form.css). */
export const Field: React.FC<FieldProps> = ({ label, labelHint, htmlFor, group = false, spaced = false, className, children }) => {
  const autoId = useId();
  let controlId = htmlFor;
  let content = children;

  const only = React.Children.count(children) === 1 ? React.Children.only(children) : null;
  if (!group && !htmlFor && React.isValidElement<{ id?: string }>(only) && (only.type === TextInput || only.type === TextArea)) {
    controlId = only.props.id ?? autoId;
    if (!only.props.id) content = React.cloneElement(only, { id: autoId });
  }

  const labelContent = (
    <>
      {label}
      {labelHint && <> <span className="form-label-hint">{labelHint}</span></>}
    </>
  );

  return (
    <div className={cx('form-group', spaced && 'form-group-spaced', className)}>
      {group ? (
        <span className="form-label">{labelContent}</span>
      ) : (
        <label className="form-label" htmlFor={controlId}>{labelContent}</label>
      )}
      {content}
    </div>
  );
};

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

/** Single-line text field. Defaults to type="text". */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(({ className, type = 'text', ...rest }, ref) => (
  <input ref={ref} type={type} className={cx('form-input', className)} {...rest} />
));
TextInput.displayName = 'TextInput';

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Multi-line text field that grows vertically. */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({ className, ...rest }, ref) => (
  <textarea ref={ref} className={cx('form-input', 'form-textarea', className)} {...rest} />
));
TextArea.displayName = 'TextArea';
