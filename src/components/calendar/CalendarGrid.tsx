import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarEvent } from '../../types';
import { formatDateStr, getDaysInMonth, getWeekRange, parseDateStr, getTodayStr } from '../../lib/dateUtils';
import { strings } from '../../constants/strings';
import { IconCopy, IconTrash } from '../ui/icons';

export const CalendarGrid: React.FC = () => {
  const {
    state,
    openModal,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    duplicateCalendarEvent
  } = useApp();

  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  const view = state.calendarView;
  const todayStr = getTodayStr();
  const weekDays = getWeekRange(state.calendarDate);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', eventId);
  };

  const handleDragOverSlot = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSlot !== slotKey) {
      setDragOverSlot(slotKey);
    }
  };

  const handleDragLeaveSlot = () => {
    setDragOverSlot(null);
  };

  const handleDropOnSlot = (e: React.DragEvent, targetDate: string, targetTime: string) => {
    e.preventDefault();
    if (draggedEventId) {
      updateCalendarEvent(draggedEventId, {
        date: targetDate,
        startTime: targetTime
      });
    }
    setDraggedEventId(null);
    setDragOverSlot(null);
  };

  const handleQuickAdd = (date: string, time: string) => {
    openModal('SCHEDULE_EVENT', { date, time });
  };

  const handleEditEvent = (event: CalendarEvent) => {
    openModal('EDIT_EVENT', { event });
  };

  const handleDeleteEvent = (event: CalendarEvent) => {
    openModal('CONFIRM_DELETE', {
      title: strings.common.delete,
      message: strings.sessions.deleteConfirmPrompt.replace('{name}', event.title),
      confirmLabel: strings.common.delete,
      onConfirm: () => deleteCalendarEvent(event.id)
    });
  };

  // 1. MONTH VIEW
  if (view === 'month') {
    const currDate = parseDateStr(state.calendarDate);
    const year = currDate.getFullYear();
    const month = currDate.getMonth();
    const totalDays = getDaysInMonth(year, month);
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const startOffset = (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1);

    const gridCells: { dayNum: number; dStr: string; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dStr = formatDateStr(new Date(year, month - 1, d));
      gridCells.push({ dayNum: d, dStr, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const dStr = formatDateStr(new Date(year, month, i));
      gridCells.push({ dayNum: i, dStr, isCurrentMonth: true });
    }

    // Next month padding
    const remaining = (gridCells.length % 7 === 0) ? 0 : 7 - (gridCells.length % 7);
    for (let i = 1; i <= remaining; i++) {
      const dStr = formatDateStr(new Date(year, month + 1, i));
      gridCells.push({ dayNum: i, dStr, isCurrentMonth: false });
    }

    return (
      <div className="card calendar-container">
        <div className="cal-month-header-row" id="calendarGridHeader">
          {dayNames.map(d => (
            <div key={d} className="cal-month-header-cell">{d}</div>
          ))}
        </div>
        <div className="cal-month-grid" id="calendarGridBody">
          {gridCells.map((cell, idx) => {
            const isToday = cell.dStr === todayStr;
            const dayEvents = state.calendarEvents.filter(e => e.date === cell.dStr);
            const isDragOver = dragOverSlot === `month_${cell.dStr}`;

            return (
              <div
                key={idx}
                className={`cal-month-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isDragOver ? 'drag-over-active' : ''}`}
                onClick={() => handleQuickAdd(cell.dStr, strings.calendar.quickAddPromptTime)}
                onDragOver={e => handleDragOverSlot(e, `month_${cell.dStr}`)}
                onDragLeave={handleDragLeaveSlot}
                onDrop={e => handleDropOnSlot(e, cell.dStr, strings.calendar.quickAddPromptTime)}
              >
                <div className="cal-month-cell-day">
                  {cell.dayNum}
                </div>
                <div className="cal-month-events-list">
                  {dayEvents.map(ev => (
                    <div
                      key={ev.id}
                      className="cal-month-event-pill"
                      draggable={true}
                      onDragStart={e => handleDragStart(e, ev.id)}
                      onClick={e => {
                        e.stopPropagation();
                        handleEditEvent(ev);
                      }}
                    >
                      ⏰ {ev.startTime} {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. WEEK & DAY VIEWS
  const activeDays = view === 'week' ? weekDays : [state.calendarDate];
  const hours: number[] = [];
  for (let h = 7; h <= 22; h++) hours.push(h);

  return (
    <div className="card calendar-container">
      <div className={`calendar-grid-header ${view === 'day' ? 'day-view' : ''}`} id="calendarGridHeader">
        <div className="cal-header-cell">Time</div>
        {activeDays.map(dStr => {
          const dObj = parseDateStr(dStr);
          const dayLabel = dayNames[dObj.getDay() === 0 ? 6 : dObj.getDay() - 1];
          const isToday = dStr === todayStr;

          return (
            <div key={dStr} className={`cal-header-cell ${isToday ? 'today' : ''}`}>
              <div>{dayLabel}</div>
              <div className="cal-header-date-num">{dObj.getDate()}</div>
            </div>
          );
        })}
      </div>

      <div className={`calendar-grid-body ${view === 'day' ? 'day-view' : ''}`} id="calendarGridBody">
        <div className="cal-time-col">
          {hours.map(h => (
            <div key={h} className="cal-time-cell">
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {activeDays.map(dStr => {
          const dayEvents = state.calendarEvents.filter(e => e.date === dStr);

          return (
            <div key={dStr} className="cal-day-col" data-date={dStr}>
              {hours.map(h => {
                const timeStr = `${String(h).padStart(2, '0')}:00`;
                const slotKey = `${dStr}_${timeStr}`;
                const isOver = dragOverSlot === slotKey;

                return (
                  <div
                    key={h}
                    className={`cal-slot ${isOver ? 'drag-over-active' : ''}`}
                    data-date={dStr}
                    data-time={timeStr}
                    onClick={() => handleQuickAdd(dStr, timeStr)}
                    onDragOver={e => handleDragOverSlot(e, slotKey)}
                    onDragLeave={handleDragLeaveSlot}
                    onDrop={e => handleDropOnSlot(e, dStr, timeStr)}
                  />
                );
              })}

              {dayEvents.map(ev => {
                const [h, m] = ev.startTime.split(':').map(Number);
                const topPx = (h - 7) * 52 + (m / 60) * 52;
                const heightPx = Math.max(36, (ev.durationMins / 60) * 52);
                const session = state.sessions.find(s => s.id === ev.sessionId);
                const isDragging = draggedEventId === ev.id;

                return (
                  <div
                    key={ev.id}
                    className={`cal-event-card draggable-item ${isDragging ? 'dragging' : ''}`}
                    draggable={true}
                    data-eid={ev.id}
                    style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                    onDragStart={e => handleDragStart(e, ev.id)}
                    onClick={e => {
                      e.stopPropagation();
                      handleEditEvent(ev);
                    }}
                  >
                    <div className="cal-event-title">{ev.title}</div>
                    <div className="cal-event-time">
                      ⏰ {ev.startTime} ({ev.durationMins}')
                      {session ? ` · ${session.name}` : ''}
                    </div>
                    <div className="cal-event-actions">
                      <button
                        className="icon-btn xs"
                        onClick={e => {
                          e.stopPropagation();
                          duplicateCalendarEvent(ev.id);
                        }}
                        title={strings.common.duplicate}
                      >
                        <IconCopy size={11} />
                      </button>
                      <button
                        className="icon-btn xs danger"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteEvent(ev);
                        }}
                        title={strings.common.delete}
                      >
                        <IconTrash size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
