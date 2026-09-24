import React from 'react';
import { DatePicker } from '../ui/DatePicker';
import { strings } from '../../constants/strings';

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
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor={`${idPrefix}Start`}>
            {strings.modals.startDateLabel} <span className="form-label-hint">{strings.modals.optionalHint}</span>
          </label>
          <DatePicker
            id={`${idPrefix}Start`}
            value={startDate}
            onChange={onStartChange}
            optional
            placeholder={strings.modals.noDatePlaceholder}
            ariaLabel={strings.modals.startDateLabel}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`${idPrefix}Due`}>
            {strings.modals.dueDateLabel} <span className="form-label-hint">{strings.modals.optionalHint}</span>
          </label>
          <DatePicker
            id={`${idPrefix}Due`}
            value={dueDate}
            onChange={onDueChange}
            optional
            placeholder={strings.modals.noDatePlaceholder}
            ariaLabel={strings.modals.dueDateLabel}
            min={startDate || undefined}
          />
        </div>
      </div>
      {invalid && (
        <p className="form-error" role="alert">
          {strings.modals.dateOrderError}
        </p>
      )}
    </>
  );
};
