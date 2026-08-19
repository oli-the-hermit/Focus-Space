import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getTodayStr } from '../../lib/dateUtils';

export const AgendaBanner: React.FC = () => {
  const { state } = useApp();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = getTodayStr();
  const todayEvents = state.calendarEvents.filter(e => e.date === todayStr);

  const fullDateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="agenda-header-banner card">
      <div className="agenda-banner-left">
        <h2 className="agenda-date-heading" id="agendaDateHeading">
          {fullDateStr}
        </h2>
        <div className="agenda-subheading" id="agendaSubheading">
          {todayEvents.length} session{todayEvents.length === 1 ? '' : 's'} scheduled for today
        </div>
      </div>

      <div className="agenda-clock" id="agendaClock">
        {timeStr}
      </div>
    </div>
  );
};
