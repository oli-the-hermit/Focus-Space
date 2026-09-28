/** Scheduled sessions on the calendar, and the calendar view. */
import type { ActionDeps } from './types';
import { strings } from '../../constants/strings';
import { format } from '../../lib/i18n';
import { uid } from '../../lib/id';
import { CalendarEvent, CalendarView } from '../../types';

export function createCalendarActions({ setState, showToast, stateRef }: Pick<ActionDeps, 'setState' | 'showToast' | 'stateRef'>) {
  const moveCalendarEvent = (eventId: string, targetDate: string, targetTime: string) => {
    // Decide outside the updater: React may run updaters twice (StrictMode), which
    // used to show this toast twice.
    if (!stateRef.current.calendarEvents.some(e => e.id === eventId)) return;
    setState(prev => ({
      ...prev,
      calendarEvents: prev.calendarEvents.map(e =>
        e.id === eventId ? { ...e, date: targetDate, startTime: targetTime } : e
      )
    }));
    showToast(format(strings.toasts.eventMoved, { date: targetDate, time: targetTime }));
  };

  const addCalendarEvent = (event: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = { ...event, id: uid() };
    setState(prev => ({ ...prev, calendarEvents: [...prev.calendarEvents, newEvent] }));
    showToast(format(strings.toasts.eventScheduled, { title: newEvent.title }));
  };

  const updateCalendarEvent = (id: string, event: Partial<CalendarEvent>) => {
    setState(prev => ({
      ...prev,
      calendarEvents: prev.calendarEvents.map(e => (e.id === id ? { ...e, ...event } : e))
    }));
    showToast(strings.toasts.eventUpdated);
  };

  const duplicateCalendarEvent = (id: string) => {
    setState(prev => {
      const target = prev.calendarEvents.find(e => e.id === id);
      if (!target) return prev;
      const dup: CalendarEvent = { ...target, id: uid(), title: format(strings.common.copyOf, { name: target.title }) };
      return { ...prev, calendarEvents: [...prev.calendarEvents, dup] };
    });
    showToast(strings.toasts.eventDuplicated);
  };

  const deleteCalendarEvent = (id: string) => {
    setState(prev => ({ ...prev, calendarEvents: prev.calendarEvents.filter(e => e.id !== id) }));
    showToast(strings.toasts.eventRemoved);
  };

  const setCalendarView = (view: CalendarView) => setState(prev => ({ ...prev, calendarView: view }));

  const setCalendarDate = (date: string) => setState(prev => ({ ...prev, calendarDate: date }));

  return { moveCalendarEvent, addCalendarEvent, updateCalendarEvent, duplicateCalendarEvent, deleteCalendarEvent, setCalendarView, setCalendarDate };
}
