import React, { useState } from 'react';
import { FormActions } from '../ui/FormActions';
import { useDirty } from '../../hooks/useDirty';
import { useApp } from '../../context/AppContext';
import { CalendarEvent } from '../../types';
import { strings } from '../../constants/strings';
import { Select } from '../ui/Select';
import { DatePicker } from '../ui/DatePicker';
import { TimePicker } from '../ui/TimePicker';
import { Stepper } from '../ui/Stepper';
import { Button } from '../ui/Button';
import { Field, TextArea, TextInput } from '../ui/Field';
import { FormRow, ModalForm } from '../ui/FormLayout';
import { DEFAULT_FOCUS_MINUTES } from '../../constants/defaults';
import { format } from '../../lib/i18n';

export interface CalendarEventModalProps {
  event?: CalendarEvent | null;
  /** Duplicate: every field starts from this event, and saving creates a new one. */
  copyFrom?: CalendarEvent | null;
  defaultDate?: string;
  defaultTime?: string;
  onClose: () => void;
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  event,
  copyFrom,
  defaultDate,
  defaultTime = '09:00',
  onClose
}) => {
  const { state, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, createSession } = useApp();

  // Editing starts from the event; duplicating starts from a copy of it.
  const source = event ?? copyFrom ?? null;
  const [title, setTitle] = useState(
    event ? event.title : copyFrom ? format(strings.common.copyOf, { name: copyFrom.title }) : ''
  );
  const [date, setDate] = useState(source ? source.date : (defaultDate || state.calendarDate));
  const [startTime, setStartTime] = useState(source ? source.startTime : defaultTime);
  const [durationMins, setDurationMins] = useState(source ? source.durationMins : 45);
  const [sessionId, setSessionId] = useState<string>(source?.sessionId || '');
  const [details, setDetails] = useState(source?.details || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || strings.modals.defaultEventTitle;
    const finalDuration = Math.max(5, Number(durationMins) || 45);
    const finalSessionId = sessionId || null;

    if (event) {
      updateCalendarEvent(event.id, {
        title: finalTitle,
        date,
        startTime,
        durationMins: finalDuration,
        sessionId: finalSessionId,
        details: details.trim()
      });
    } else {
      addCalendarEvent({
        title: finalTitle,
        date,
        startTime,
        durationMins: finalDuration,
        sessionId: finalSessionId,
        details: details.trim()
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (event) {
      deleteCalendarEvent(event.id);
      onClose();
    }
  };

  const dirty = useDirty([title, date, startTime, durationMins, sessionId, details]);

  return (
    <ModalForm onSubmit={handleSubmit}>
      <Field label={strings.modals.titleActivityLabel} htmlFor="eventTitle">
        <TextInput
          id="eventTitle"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={strings.modals.titleActivityPlaceholder}
          autoFocus
        />
      </Field>

      <FormRow>
        <Field label={strings.modals.dateLabel} htmlFor="eventDate">
          <DatePicker id="eventDate" value={date} onChange={val => val && setDate(val)} ariaLabel={strings.modals.dateLabel} />
        </Field>
        <Field label={strings.modals.startTimeLabel} htmlFor="eventTime">
          <TimePicker id="eventTime" value={startTime} onChange={setStartTime} ariaLabel={strings.modals.startTimeLabel} />
        </Field>
      </FormRow>

      <FormRow>
        <Field label={strings.modals.durationLabel} htmlFor="eventDuration">
          <Stepper
            id="eventDuration"
            value={durationMins}
            onChange={setDurationMins}
            min={5}
            max={360}
            step={5}
            suffix={strings.modals.minutesSuffix}
          />
        </Field>
        <Field label={strings.modals.linkedSessionLabel} group>
          <Select
            value={sessionId}
            onChange={val => {
              const sId = val;
              setSessionId(sId);
              if (sId) {
                const s = state.sessions.find(x => x.id === sId);
                if (s) setDurationMins(s.focusMinutes);
              }
            }}
            placeholder={strings.modals.standardEventOption}
            ariaLabel={strings.modals.linkedSessionLabel}
            options={[
              { value: '', label: strings.modals.standardEventOption },
              ...state.sessions.map(s => ({
                value: s.id,
                label: s.name,
                meta: `${s.focusMinutes}m`
              }))
            ]}
            createOption={{
              label: strings.modals.newSessionOption,
              placeholder: strings.modals.newSessionPlaceholder,
              onCreate: sessionName => {
                const newId = createSession({ name: sessionName, focusMinutes: durationMins || DEFAULT_FOCUS_MINUTES, breakMinutes: 5, rewardId: null });
                setSessionId(newId);
              }
            }}
          />
        </Field>
      </FormRow>

      <Field label={strings.modals.detailsLabel}>
        <TextArea
          value={details}
          onChange={e => setDetails(e.target.value)}
          placeholder={strings.modals.detailsPlaceholder}
          rows={3}
        />
      </Field>

      <FormActions
        dirty={dirty}
        onCancel={onClose}
        primaryLabel={event ? strings.common.saveChanges : strings.modals.scheduleEvent}
        leading={
          event && (
            <Button variant="danger" onClick={handleDelete}>
              {strings.common.delete}
            </Button>
          )
        }
      />
    </ModalForm>
  );
};
