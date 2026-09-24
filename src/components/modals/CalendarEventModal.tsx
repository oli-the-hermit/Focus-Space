import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarEvent } from '../../types';
import { strings } from '../../constants/strings';
import { Select } from '../ui/Select';
import { DatePicker } from '../ui/DatePicker';
import { TimePicker } from '../ui/TimePicker';
import { Stepper } from '../ui/Stepper';

export interface CalendarEventModalProps {
  event?: CalendarEvent | null;
  defaultDate?: string;
  defaultTime?: string;
  onClose: () => void;
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  event,
  defaultDate,
  defaultTime = '09:00',
  onClose
}) => {
  const { state, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, createSession } = useApp();

  const [title, setTitle] = useState(event ? event.title : '');
  const [date, setDate] = useState(event ? event.date : (defaultDate || state.calendarDate));
  const [startTime, setStartTime] = useState(event ? event.startTime : defaultTime);
  const [durationMins, setDurationMins] = useState(event ? event.durationMins : 45);
  const [sessionId, setSessionId] = useState<string>(event?.sessionId || '');
  const [details, setDetails] = useState(event?.details || '');

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

  return (
    <form onSubmit={handleSubmit} className="modal-form">
      <div className="form-group">
        <label className="form-label" htmlFor="eventTitle">{strings.modals.titleActivityLabel}</label>
        <input
          id="eventTitle"
          type="text"
          className="form-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={strings.modals.titleActivityPlaceholder}
          autoFocus
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="eventDate">{strings.modals.dateLabel}</label>
          <DatePicker id="eventDate" value={date} onChange={val => val && setDate(val)} ariaLabel={strings.modals.dateLabel} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="eventTime">{strings.modals.startTimeLabel}</label>
          <TimePicker id="eventTime" value={startTime} onChange={setStartTime} ariaLabel={strings.modals.startTimeLabel} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="eventDuration">{strings.modals.durationLabel}</label>
          <Stepper
            id="eventDuration"
            value={durationMins}
            onChange={setDurationMins}
            min={5}
            max={360}
            step={5}
            suffix={strings.modals.minutesSuffix}
          />
        </div>
        <div className="form-group">
          <span className="form-label">{strings.modals.linkedSessionLabel}</span>
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
                const newId = createSession({ name: sessionName, focusMinutes: durationMins || 25, breakMinutes: 5, rewardId: null });
                setSessionId(newId);
              }
            }}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">{strings.modals.detailsLabel}</label>
        <textarea
          className="form-input form-textarea"
          value={details}
          onChange={e => setDetails(e.target.value)}
          placeholder={strings.modals.detailsPlaceholder}
          rows={3}
        />
      </div>

      <div className="modal-actions">
        {event && (
          <button
            type="button"
            className="btn-action danger btn-action-auto-left"
            onClick={handleDelete}
          >
            {strings.common.delete}
          </button>
        )}
        <button type="button" className="btn-action" onClick={onClose}>
          {strings.common.cancel}
        </button>
        <button type="submit" className="btn-action primary">
          {event ? strings.common.saveChanges : strings.calendar.scheduleSessionBtn}
        </button>
      </div>
    </form>
  );
};
