import React from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarEvent } from '../../types';
import { getTodayStr } from '../../lib/dateUtils';

export const AgendaTimeline: React.FC = () => {
  const {
    state,
    deleteCalendarEvent,
    addCalendarEvent,
    setActiveSession,
    setSelectedListForTimer,
    setActiveTab,
    toggleTimer,
    resetTimer,
    showToast
  } = useApp();

  const todayStr = getTodayStr();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const todayEvents = state.calendarEvents
    .filter(e => e.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleAddSchedule = () => {
    const title = prompt('Schedule Session Title:');
    if (!title || !title.trim()) return;
    const time = prompt('Start time (HH:mm):', '09:00');

    addCalendarEvent({
      title: title.trim(),
      date: todayStr,
      startTime: time || '09:00',
      durationMins: 25
    });
  };

  const handleJumpIn = (ev: CalendarEvent) => {
    if (ev.sessionId) setActiveSession(ev.sessionId);
    if (ev.taskListId) setSelectedListForTimer(ev.taskListId);
    setActiveTab('timer');
    resetTimer();
    toggleTimer();
    showToast(`🚀 Launched focus session: "${ev.title}"!`);
  };

  return (
    <div className="card agenda-list-card">
      <div className="panel-card-header">
        <span className="panel-card-title">📅 Today's Timeline</span>
        <button className="btn-action" id="agendaAddBtn" onClick={handleAddSchedule}>
          + Schedule for Today
        </button>
      </div>

      <div className="agenda-events-list" id="agendaEventsList">
        {todayEvents.length === 0 ? (
          <div className="empty-state small">No sessions scheduled for today yet.</div>
        ) : (
          todayEvents.map(ev => {
            const [h, m] = ev.startTime.split(':').map(Number);
            const startMins = h * 60 + m;
            const endMins = startMins + ev.durationMins;

            let statusLabel = 'Upcoming';
            let statusStyle = {};

            if (nowMinutes >= startMins && nowMinutes < endMins) {
              statusLabel = 'Live Now';
              statusStyle = { color: 'var(--success)', fontWeight: 700 };
            } else if (nowMinutes >= endMins) {
              statusLabel = 'Done';
              statusStyle = { color: 'var(--text-muted)' };
            }

            const taskList = state.taskLists.find(l => l.id === ev.taskListId);

            return (
              <div key={ev.id} className="agenda-item-card">
                <div className="agenda-item-left">
                  <div className="agenda-item-time" style={statusStyle}>
                    {ev.startTime} · {statusLabel}
                  </div>
                  <div className="agenda-item-title">{ev.title}</div>
                  <div className="agenda-item-meta">
                    <span>⏱️ {ev.durationMins} mins</span>
                    {taskList ? <span>📋 {taskList.name}</span> : null}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="btn-action primary"
                    style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                    onClick={() => handleJumpIn(ev)}
                  >
                    Jump In
                  </button>
                  <button
                    className="icon-btn xs danger"
                    onClick={() => deleteCalendarEvent(ev.id)}
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
