import React from 'react';
import { daysBetween, getTodayStr } from '../../lib/dateUtils';
import { formatShortDate } from '../../lib/formatUtils';
import { strings } from '../../constants/strings';
import { IconCalendar } from '../ui/icons';

export interface ScheduleBadgeProps {
  startDate?: string | null;
  dueDate?: string | null;
  completed: boolean;
  compact?: boolean;
}

/** Date range plus a relative status ("12 days left", "Overdue 3 days"). Renders nothing without dates. */
export const ScheduleBadge: React.FC<ScheduleBadgeProps> = ({ startDate, dueDate, completed, compact = false }) => {
  if (!startDate && !dueDate) return null;
  const today = getTodayStr();

  let range: string;
  if (startDate && dueDate) range = `${formatShortDate(startDate)} → ${formatShortDate(dueDate)}`;
  else if (dueDate) range = strings.goals.dueOn.replace('{date}', formatShortDate(dueDate));
  else range = strings.goals.startsOn.replace('{date}', formatShortDate(startDate!));

  let status = '';
  let tone: 'neutral' | 'warn' | 'done' = 'neutral';
  if (completed) {
    tone = 'done';
  } else if (startDate && startDate > today) {
    const d = daysBetween(today, startDate);
    status = strings.goals.startsIn.replace('{count}', String(d)).replace('{s}', d === 1 ? '' : 's');
  } else if (dueDate) {
    const d = daysBetween(today, dueDate);
    if (d > 0) status = strings.goals.daysLeft.replace('{count}', String(d)).replace('{s}', d === 1 ? '' : 's');
    else if (d === 0) {
      status = strings.goals.dueToday;
      tone = 'warn';
    } else {
      status = strings.goals.overdue.replace('{count}', String(-d)).replace('{s}', d === -1 ? '' : 's');
      tone = 'warn';
    }
  }

  return (
    <span className={`schedule-badge tone-${tone} ${compact ? 'is-compact' : ''}`}>
      <IconCalendar size={compact ? 12 : 14} />
      <span className="schedule-badge-range">{range}</span>
      {status && <span className="schedule-badge-status">{status}</span>}
    </span>
  );
};
