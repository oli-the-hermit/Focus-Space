import React from 'react';
import { DatePicker } from '../ui/DatePicker';
import { strings } from '../../constants/strings';
import { Field } from '../ui/Field';
import { FormError, FormRow } from '../ui/FormLayout';

export interface DateRangeFieldsProps {
  idPrefix: string;
  startDate: string;
  dueDate: string;
  onStartChange: (value: string) => void;
  onDueChange: (value: string) => void;
}

/** True when both dates are set and completion comes before start. */
export function isDateRangeInvalid(startDate: string, dueDate: string): boolean {
  return !!startDate && !!dueDate && dueDate < startDate;
}

/** Optional start / estimated-completion pair shared by the goal and landmark dialogs. */
export const DateRangeFields: React.FC<DateRangeFieldsProps> = ({
  idPrefix,
  startDate,
  dueDate,
  onStartChange,
  onDueChange
}) => {
  const invalid = isDateRangeInvalid(startDate, dueDate);
  return (
    <>
      <FormRow>
        <Field label={strings.modals.startDateLabel} labelHint={strings.modals.optionalHint} htmlFor={`${idPrefix}Start`}>
          <DatePicker
            id={`${idPrefix}Start`}
            value={startDate}
            onChange={onStartChange}
            optional
            placeholder={strings.modals.noDatePlaceholder}
            ariaLabel={strings.modals.startDateLabel}
          />
        </Field>
        <Field label={strings.modals.dueDateLabel} labelHint={strings.modals.optionalHint} htmlFor={`${idPrefix}Due`}>
          <DatePicker
            id={`${idPrefix}Due`}
            value={dueDate}
            onChange={onDueChange}
            optional
            placeholder={strings.modals.noDatePlaceholder}
            ariaLabel={strings.modals.dueDateLabel}
            min={startDate || undefined}
          />
        </Field>
      </FormRow>
      {invalid && (
        <FormError>{strings.modals.dateOrderError}</FormError>
      )}
    </>
  );
};
