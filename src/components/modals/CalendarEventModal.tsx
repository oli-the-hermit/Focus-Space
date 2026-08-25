import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarEvent } from '../../types';
import { strings } from '../../constants/strings';

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
  const { state, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = useApp();

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
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">{strings.modals.titleActivityLabel}</label>
        <input
          type="text"
          className="form-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={strings.modals.titleActivityPlaceholder}
          autoFocus
        />
      </div>

      <div className="form-row form-group-spaced">
        <div className="form-group">
          <label className="form-label">{strings.modals.dateLabel}</label>
          <input
            type="date"
            className="form-input"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">{strings.modals.startTimeLabel}</label>
          <input
            type="time"
            className="form-input"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
          />
        </div>
      </div>

      <div className="form-row form-group-spaced">
        <div className="form-group">
          <label className="form-label">{strings.modals.durationLabel}</label>
          <input
            type="number"
            className="form-input"
            value={durationMins}
            onChange={e => setDurationMins(Number(e.target.value))}
            min={5}
            max={360}
            step={5}
          />
        </div>
        <div className="form-group">
          <label className="form-label">{strings.modals.linkedSessionLabel}</label>
          <select
            className="form-select"
            value={sessionId}
            onChange={e => {
              const sId = e.target.value;
              setSessionId(sId);
              if (sId) {
                const s = state.sessions.find(x => x.id === sId);
                if (s) setDurationMins(s.focusMinutes);
              }
            }}
          >
            <option value="">{strings.modals.standardEventOption}</option>
            {state.sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.focusMinutes}m)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group form-group-spaced">
        <label className="form-label">{strings.modals.detailsLabel}</label>
        <textarea
          className="form-input form-textarea"
          value={details}
          onChange={e => setDetails(e.target.value)}
          placeholder={strings.modals.detailsPlaceholder}
          rows={3}
        />
      </div>

      <div className="modal-actions modal-form-actions">
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
