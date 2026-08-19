import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarEvent } from '../../types';
import { formatDateStr, getTodayStr, getWeekRange, parseDateStr } from '../../lib/dateUtils';

export const CalendarGrid: React.FC = () => {
  const {
    state,
    openModal,
    duplicateCalendarEvent,
    deleteCalendarEvent,
    moveCalendarEvent
  } = useApp();

  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  const view = state.calendarView;
  const currDate = parseDateStr(state.calendarDate);
  const todayStr = getTodayStr();
  const weekDays = getWeekRange(state.calendarDate);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleQuickAdd = (dateStr: string, timeStr: string) => {
    openModal('SCHEDULE_EVENT', {
      date: dateStr,
      time: timeStr
    });
  };

  const handleEditEvent = (ev: CalendarEvent) => {
    openModal('EDIT_EVENT', { event: ev });
  };

  const handleDeleteEvent = (ev: CalendarEvent) => {
    openModal('CONFIRM_DELETE', {
      title: 'Remove Event',
      message: `Remove event "${ev.title}"?`,
      confirmLabel: 'Remove',
      onConfirm: () => deleteCalendarEvent(ev.id)
    });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedEventId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
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

  const handleDropOnSlot = (e: React.DragEvent, dateStr: string, timeStr: string) => {
    e.preventDefault();
    if (draggedEventId) {
      moveCalendarEvent(draggedEventId, dateStr, timeStr);
    }
    setDraggedEventId(null);
    setDragOverSlot(null);
  };

  // 1. MONTH VIEW
  if (view === 'month') {
    const year = currDate.getFullYear();
    const month = currDate.getMonth();

    const firstDay = new Date(year, month, 1);
    let startDayIdx = firstDay.getDay() - 1;
    if (startDayIdx === -1) startDayIdx = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const gridCells: { dayNum: number; dStr: string; isCurrentMonth: boolean }[] = [];

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayIdx - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const dStr = formatDateStr(new Date(year, month - 1, dayNum));
      gridCells.push({ dayNum, dStr, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      gridCells.push({ dayNum: d, dStr, isCurrentMonth: true });
    }

    const remaining = (gridCells.length % 7 === 0) ? 0 : 7 - (gridCells.length % 7);
    for (let i = 1; i <= remaining; i++) {
      const dStr = formatDateStr(new Date(year, month + 1, i));
      gridCells.push({ dayNum: i, dStr, isCurrentMonth: false });
    }

    return (
      <div className="card calendar-container">
        <div className="cal-month-header-row" id="calendarGridHeader" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 600, padding: '10px 0', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          {dayNames.map(d => (
            <div key={d} className="cal-month-header-cell">{d}</div>
          ))}
        </div>
        <div className="cal-month-grid" id="calendarGridBody" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: '520px' }}>
          {gridCells.map((cell, idx) => {
            const isToday = cell.dStr === todayStr;
            const dayEvents = state.calendarEvents.filter(e => e.date === cell.dStr);
            const isDragOver = dragOverSlot === `month_${cell.dStr}`;

            return (
              <div
                key={idx}
                className={`cal-month-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                style={{
                  borderRight: '1px solid var(--border-light)',
                  borderBottom: '1px solid var(--border-light)',
                  padding: '8px',
                  minHeight: '88px',
                  cursor: 'pointer',
                  opacity: !cell.isCurrentMonth ? 0.45 : 1,
                  background: isDragOver ? 'rgba(26,115,232,0.12)' : (isToday ? 'var(--accent-light)' : 'transparent')
                }}
                onClick={() => handleQuickAdd(cell.dStr, '09:00')}
                onDragOver={e => handleDragOverSlot(e, `month_${cell.dStr}`)}
                onDragLeave={handleDragLeaveSlot}
                onDrop={e => handleDropOnSlot(e, cell.dStr, '09:00')}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px', color: isToday ? 'var(--accent)' : 'inherit' }}>
                  {cell.dayNum}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {dayEvents.map(ev => (
                    <div
                      key={ev.id}
                      className="cal-month-event-pill"
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: 'var(--surface)',
                        border: '1px solid var(--accent)',
                        borderLeft: '3px solid var(--accent)',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
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
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{dObj.getDate()}</div>
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
                    className="cal-slot"
                    data-date={dStr}
                    data-time={timeStr}
                    style={{ background: isOver ? 'rgba(26,115,232,0.12)' : undefined }}
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
                        title="Duplicate"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      <button
                        className="icon-btn xs danger"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteEvent(ev);
                        }}
                        title="Remove"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        </svg>
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
