import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarEvent } from '../../types';
import { formatDateStr, getDaysInMonth, getWeekRange, parseDateStr, getTodayStr } from '../../lib/dateUtils';
import { strings } from '../../constants/strings';
import { IconCalendar, IconCopy, IconEdit, IconList, IconTrash } from '../ui/icons';
import { useContextMenu } from '../ui/ContextMenu';
import { isDragLeavingElement } from '../../lib/dnd';

const FIRST_HOUR = 7;
const LAST_HOUR = 22;
const MONTH_VISIBLE_EVENTS = 3;

export const CalendarGrid: React.FC = () => {
  const {
    state,
    openModal,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    duplicateCalendarEvent,
    setCalendarDate,
    setCalendarView
  } = useApp();

  const contextMenu = useContextMenu();
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

  const handleDragLeaveSlot = (e: React.DragEvent) => {
    if (isDragLeavingElement(e)) setDragOverSlot(null);
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

  const openDayView = (date: string) => {
    setCalendarDate(date);
    setCalendarView('day');
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

  const openEventMenu = (e: React.MouseEvent, ev: CalendarEvent) => {
    e.stopPropagation();
    contextMenu(e, [
      { key: 'edit', label: strings.common.edit, icon: <IconEdit size={15} />, onSelect: () => handleEditEvent(ev) },
      { key: 'dup', label: strings.common.duplicate, icon: <IconCopy size={15} />, onSelect: () => duplicateCalendarEvent(ev.id) },
      { key: 'd1', divider: true },
      { key: 'delete', label: strings.common.delete, icon: <IconTrash size={15} />, danger: true, onSelect: () => handleDeleteEvent(ev) }
    ]);
  };

  const openSlotMenu = (e: React.MouseEvent, date: string, time: string) =>
    contextMenu(e, [
      { key: 'schedule', label: strings.contextMenu.scheduleHere, icon: <IconCalendar size={16} />, onSelect: () => handleQuickAdd(date, time) },
      view !== 'day' && { key: 'day', label: strings.contextMenu.openDay, icon: <IconList size={16} />, onSelect: () => openDayView(date) }
    ]);

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

    const rowCount = gridCells.length / 7;

    return (
      <div className="card calendar-container is-month">
        <div className="cal-month-header-row" id="calendarGridHeader">
          {dayNames.map(d => (
            <div key={d} className="cal-month-header-cell">{d}</div>
          ))}
        </div>
        <div
          className="cal-month-grid"
          id="calendarGridBody"
          style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
        >
          {gridCells.map((cell, idx) => {
            const isToday = cell.dStr === todayStr;
            const dayEvents = state.calendarEvents
              .filter(e => e.date === cell.dStr)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            const visibleEvents = dayEvents.slice(0, MONTH_VISIBLE_EVENTS);
            const hiddenCount = dayEvents.length - visibleEvents.length;
            const isDragOver = dragOverSlot === `month_${cell.dStr}`;

            return (
              <div
                key={idx}
                className={`cal-month-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isDragOver ? 'drag-over-active' : ''}`}
                onClick={() => handleQuickAdd(cell.dStr, strings.calendar.quickAddPromptTime)}
                onContextMenu={e => openSlotMenu(e, cell.dStr, strings.calendar.quickAddPromptTime)}
                onDragOver={e => handleDragOverSlot(e, `month_${cell.dStr}`)}
                onDragLeave={handleDragLeaveSlot}
                onDrop={e => handleDropOnSlot(e, cell.dStr, strings.calendar.quickAddPromptTime)}
              >
                <div className="cal-month-cell-day">
                  <span>{cell.dayNum}</span>
                </div>
                <div className="cal-month-events-list">
                  {visibleEvents.map(ev => (
                    <div
                      key={ev.id}
                      className="cal-month-event-pill"
                      draggable={true}
                      title={`${ev.startTime} ${ev.title}`}
                      onDragStart={e => handleDragStart(e, ev.id)}
                      onContextMenu={e => openEventMenu(e, ev)}
                      onClick={e => {
                        e.stopPropagation();
                        handleEditEvent(ev);
                      }}
                    >
                      <span className="cal-month-event-time">{ev.startTime}</span> {ev.title}
                    </div>
                  ))}
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      className="cal-month-more"
                      onClick={e => {
                        e.stopPropagation();
                        openDayView(cell.dStr);
                      }}
                    >
                      {strings.calendar.moreEvents.replace('{count}', String(hiddenCount))}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. WEEK & DAY VIEWS
  // Rows share the available height (1fr each); events are placed in percent of
  // the day column, so the grid fills the viewport without any JS measuring.
  const activeDays = view === 'week' ? weekDays : [state.calendarDate];
  const hours: number[] = [];
  for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) hours.push(h);
  const hourCount = hours.length;

  const now = new Date();
  const nowHours = now.getHours() + now.getMinutes() / 60;
  const nowPct = ((nowHours - FIRST_HOUR) / hourCount) * 100;
  const showNowLine = nowPct >= 0 && nowPct <= 100;

  return (
    <div className="card calendar-container">
      <div className={`calendar-grid-header ${view === 'day' ? 'day-view' : ''}`} id="calendarGridHeader">
        <div className="cal-header-cell cal-header-cell--time" />
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

      <div
        className={`calendar-grid-body ${view === 'day' ? 'day-view' : ''}`}
        id="calendarGridBody"
        style={{ '--hour-count': hourCount } as React.CSSProperties}
      >
        <div className="cal-time-col">
          {hours.map(h => (
            <div key={h} className="cal-time-cell">
              <span>{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        {activeDays.map(dStr => {
          const dayEvents = state.calendarEvents.filter(e => e.date === dStr);
          const isToday = dStr === todayStr;

          return (
            <div key={dStr} className={`cal-day-col ${isToday ? 'is-today' : ''}`} data-date={dStr}>
              {isToday && showNowLine && (
                <div className="cal-now-line" style={{ top: `${nowPct}%` }} aria-hidden="true" />
              )}
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
                    onContextMenu={e => openSlotMenu(e, dStr, timeStr)}
                    onDragOver={e => handleDragOverSlot(e, slotKey)}
                    onDragLeave={handleDragLeaveSlot}
                    onDrop={e => handleDropOnSlot(e, dStr, timeStr)}
                  />
                );
              })}

              {dayEvents.map(ev => {
                const [h, m] = ev.startTime.split(':').map(Number);
                const topPct = (((h || 0) - FIRST_HOUR + (m || 0) / 60) / hourCount) * 100;
                const heightPct = (ev.durationMins / 60 / hourCount) * 100;
                const session = state.sessions.find(s => s.id === ev.sessionId);
                const isDragging = draggedEventId === ev.id;

                return (
                  <div
                    key={ev.id}
                    className={`cal-event-card draggable-item ${isDragging ? 'dragging' : ''} ${session ? 'is-session' : ''}`}
                    draggable={true}
                    data-eid={ev.id}
                    style={{ top: `${topPct}%`, height: `${heightPct}%` }}
                    onDragStart={e => handleDragStart(e, ev.id)}
                    onContextMenu={e => openEventMenu(e, ev)}
                    onClick={e => {
                      e.stopPropagation();
                      handleEditEvent(ev);
                    }}
                  >
                    <div className="cal-event-title">{ev.title}</div>
                    <div className="cal-event-time">
                      {ev.startTime} · {ev.durationMins}′
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
