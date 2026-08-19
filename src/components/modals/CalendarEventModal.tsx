import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarEvent } from '../../types';

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
    const finalTitle = title.trim() || 'Scheduled Session';
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
        <label className="form-label">Title / Activity</label>
        <input
          type="text"
          className="form-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Morning Focus Session"
          autoFocus
        />
      </div>

      <div className="form-row" style={{ marginTop: '12px' }}>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            type="date"
            className="form-input"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Start Time</label>
          <input
            type="time"
            className="form-input"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '12px' }}>
        <div className="form-group">
          <label className="form-label">Duration (minutes)</label>
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
          <label className="form-label">Linked Session (optional)</label>
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
            <option value="">— Standard Event —</option>
            {state.sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.focusMinutes}m)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '12px' }}>
        <label className="form-label">Details / Notes</label>
        <textarea
          className="form-input form-textarea"
          value={details}
          onChange={e => setDetails(e.target.value)}
          placeholder="Add specific task notes or goals for this block…"
          rows={3}
        />
      </div>

      <div className="modal-actions" style={{ marginTop: '20px' }}>
        {event && (
          <button
            type="button"
            className="btn-action danger"
            onClick={handleDelete}
            style={{ marginRight: 'auto' }}
          >
            Delete
          </button>
        )}
        <button type="button" className="btn-action" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-action primary">
          {event ? 'Save Changes' : 'Schedule Event'}
        </button>
      </div>
    </form>
  );
};
