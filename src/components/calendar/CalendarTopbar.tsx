import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDateStr, getTodayStr, getWeekRange, parseDateStr } from '../../lib/dateUtils';

export const CalendarTopbar: React.FC = () => {
  const { state, setCalendarView, setCalendarDate, openModal } = useApp();

  const currDate = parseDateStr(state.calendarDate);
  const view = state.calendarView;
  const weekDays = getWeekRange(state.calendarDate);

  const handlePrev = () => {
    const d = parseDateStr(state.calendarDate);
    if (view === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (view === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCalendarDate(formatDateStr(d));
  };

  const handleNext = () => {
    const d = parseDateStr(state.calendarDate);
    if (view === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (view === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCalendarDate(formatDateStr(d));
  };

  const handleToday = () => {
    setCalendarDate(getTodayStr());
  };

  const handleSchedule = () => {
    openModal('SCHEDULE_EVENT', {
      date: state.calendarDate,
      time: '09:00'
    });
  };

  let dateTitleText = '';
  if (view === 'week') {
    const startStr = parseDateStr(weekDays[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = parseDateStr(weekDays[6]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    dateTitleText = `${startStr} – ${endStr}`;
  } else if (view === 'day') {
    dateTitleText = currDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } else {
    dateTitleText = currDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  return (
    <div className="calendar-topbar">
      <div className="cal-nav-group">
        <button className="btn-action" id="calPrevBtn" onClick={handlePrev}>&larr; Prev</button>
        <button className="btn-action" id="calTodayBtn" onClick={handleToday}>Today</button>
        <button className="btn-action" id="calNextBtn" onClick={handleNext}>Next &rarr;</button>
        <span className="cal-title-date" id="calDateTitle">
          {dateTitleText}
        </span>
      </div>

      <div className="cal-right-tools">
        <div className="filter-tabs" id="calViewTabs">
          <button
            className={`filter-tab ${view === 'week' ? 'active' : ''}`}
            data-view="week"
            onClick={() => setCalendarView('week')}
          >
            Week
          </button>
          <button
            className={`filter-tab ${view === 'day' ? 'active' : ''}`}
            data-view="day"
            onClick={() => setCalendarView('day')}
          >
            Day
          </button>
          <button
            className={`filter-tab ${view === 'month' ? 'active' : ''}`}
            data-view="month"
            onClick={() => setCalendarView('month')}
          >
            Month
          </button>
        </div>
        <button className="btn-action primary" id="addCalEventBtn" onClick={handleSchedule}>
          + Schedule Session
        </button>
      </div>
    </div>
  );
};
