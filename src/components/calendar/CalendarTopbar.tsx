import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDateStr, getTodayStr, getWeekRange, parseDateStr } from '../../lib/dateUtils';
import { strings } from '../../constants/strings';
import { IconChevronLeft, IconChevronRight } from '../ui/icons';

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
      time: strings.calendar.quickAddPromptTime
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
        <button className="btn-action tonal" id="calTodayBtn" onClick={handleToday}>{strings.calendar.todayBtn}</button>
        <div className="cal-step-group">
          <button className="icon-btn" id="calPrevBtn" onClick={handlePrev} aria-label={strings.calendar.prevBtn} title={strings.calendar.prevBtn}>
            <IconChevronLeft size={20} />
          </button>
          <button className="icon-btn" id="calNextBtn" onClick={handleNext} aria-label={strings.calendar.nextBtn} title={strings.calendar.nextBtn}>
            <IconChevronRight size={20} />
          </button>
        </div>
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
            {strings.calendar.views.week}
          </button>
          <button
            className={`filter-tab ${view === 'day' ? 'active' : ''}`}
            data-view="day"
            onClick={() => setCalendarView('day')}
          >
            {strings.calendar.views.day}
          </button>
          <button
            className={`filter-tab ${view === 'month' ? 'active' : ''}`}
            data-view="month"
            onClick={() => setCalendarView('month')}
          >
            {strings.calendar.views.month}
          </button>
        </div>
        <button className="btn-action primary" id="addCalEventBtn" onClick={handleSchedule}>
          {strings.calendar.scheduleSessionBtn}
        </button>
      </div>
    </div>
  );
};
