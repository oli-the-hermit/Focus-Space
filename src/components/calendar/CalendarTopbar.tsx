import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDateStr, getTodayStr, getWeekRange, parseDateStr } from '../../lib/dateUtils';
import { strings } from '../../constants/strings';
import { IconChevronLeft, IconChevronRight, IconPlus } from '../ui/icons';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { LOCALE } from '../../lib/i18n';
import { SegmentedControl } from '../ui/SegmentedControl';

const VIEW_OPTIONS = (['week', 'day', 'month'] as const).map(v => ({ value: v, label: strings.calendar.views[v] }));

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
    const startStr = parseDateStr(weekDays[0]).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' });
    const endStr = parseDateStr(weekDays[6]).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' });
    dateTitleText = `${startStr} – ${endStr}`;
  } else if (view === 'day') {
    dateTitleText = currDate.toLocaleDateString(LOCALE, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } else {
    dateTitleText = currDate.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
  }

  return (
    <div className="calendar-topbar">
      <div className="cal-nav-group">
        <Button variant="tonal" id="calTodayBtn" onClick={handleToday}>{strings.calendar.todayBtn}</Button>
        <div className="cal-step-group">
          <IconButton label={strings.calendar.prevBtn} id="calPrevBtn" surface={0} onClick={handlePrev}>
            <IconChevronLeft size={20} />
          </IconButton>
          <IconButton label={strings.calendar.nextBtn} id="calNextBtn" surface={0} onClick={handleNext}>
            <IconChevronRight size={20} />
          </IconButton>
        </div>
        <span className="cal-title-date" id="calDateTitle">
          {dateTitleText}
        </span>
      </div>

      <div className="cal-right-tools">
        <SegmentedControl
          id="calViewTabs"
          options={VIEW_OPTIONS}
          value={view}
          onChange={setCalendarView}
          ariaLabel={strings.calendar.viewLabel}
        />
        <Button variant="primary" id="addCalEventBtn" icon={<IconPlus size={16} strokeWidth={2.4} />} onClick={handleSchedule}>
          {strings.actions.scheduleSession}
        </Button>
      </div>
    </div>
  );
};
