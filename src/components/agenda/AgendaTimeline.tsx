import React from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarEvent } from '../../types';
import { getTodayStr } from '../../lib/dateUtils';
import { strings } from '../../constants/strings';
import { IconTrash } from '../ui/icons';

export const AgendaTimeline: React.FC = () => {
  const {
    state,
    deleteCalendarEvent,
    openModal,
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
    openModal('SCHEDULE_EVENT', {
      date: todayStr,
      time: strings.calendar.quickAddPromptTime
    });
  };

  const handleJumpIn = (ev: CalendarEvent) => {
    if (ev.sessionId) setActiveSession(ev.sessionId);
    if (ev.taskListId) setSelectedListForTimer(ev.taskListId);
    setActiveTab('timer');
    resetTimer();
    toggleTimer();
    showToast(strings.agenda.launchedToast.replace('{title}', ev.title));
  };

  return (
    <div className="card agenda-list-card">
      <div className="panel-card-header">
        <span className="panel-card-title">{strings.agenda.timelineTitle}</span>
        <button className="btn-action" id="agendaAddBtn" onClick={handleAddSchedule}>
          {strings.agenda.scheduleBtn}
        </button>
      </div>

      <div className="agenda-events-list" id="agendaEventsList">
        {todayEvents.length === 0 ? (
          <div className="empty-state small">{strings.agenda.emptyTimeline}</div>
        ) : (
          todayEvents.map(ev => {
            const [h, m] = ev.startTime.split(':').map(Number);
            const startMins = h * 60 + m;
            const endMins = startMins + ev.durationMins;

            let statusLabel: string = strings.agenda.statusUpcoming;
            let statusClass = 'status-upcoming';

            if (nowMinutes >= startMins && nowMinutes < endMins) {
              statusLabel = strings.agenda.statusLive;
              statusClass = 'status-live';
            } else if (nowMinutes >= endMins) {
              statusLabel = strings.agenda.statusDone;
              statusClass = 'status-done';
            }

            const taskList = state.taskLists.find(l => l.id === ev.taskListId);

            return (
              <div key={ev.id} className="agenda-item-card">
                <div className="agenda-item-left">
                  <div className={`agenda-item-time ${statusClass}`}>
                    {ev.startTime} · {statusLabel}
                  </div>
                  <div className="agenda-item-title">{ev.title}</div>
                  <div className="agenda-item-meta">
                    <span>⏱️ {ev.durationMins} mins</span>
                    {taskList ? <span>📋 {taskList.name}</span> : null}
                  </div>
                </div>

                <div className="agenda-actions-wrap">
                  <button
                    className="btn-action primary agenda-jump-in-btn"
                    onClick={() => handleJumpIn(ev)}
                  >
                    {strings.agenda.jumpInBtn}
                  </button>
                  <button
                    className="icon-btn xs danger"
                    onClick={() => deleteCalendarEvent(ev.id)}
                    title={strings.common.delete}
                  >
                    <IconTrash size={12} />
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
