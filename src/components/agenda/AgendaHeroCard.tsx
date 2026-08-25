import React from 'react';
import { useApp } from '../../context/AppContext';
import { getTodayStr } from '../../lib/dateUtils';
import { strings } from '../../constants/strings';

export const AgendaHeroCard: React.FC = () => {
  const { state, setActiveSession, setActiveTab, toggleTimer } = useApp();

  const todayStr = getTodayStr();
  const upcomingEvents = state.calendarEvents.filter(ev => ev.date === todayStr);
  const nextEvent = upcomingEvents[0];
  const matchedSession = state.sessions.find(s => s.id === nextEvent?.sessionId) || state.sessions[0];

  if (!nextEvent) {
    return (
      <div className="card agenda-hero-card">
        <div className="empty-state">
          {strings.agenda.noUpcomingHero}
        </div>
      </div>
    );
  }

  const handleStartSession = () => {
    if (matchedSession) {
      setActiveSession(matchedSession.id);
    }
    setActiveTab('timer');
    toggleTimer();
  };

  return (
    <div className="card agenda-hero-card">
      <div className="agenda-hero-badge">
        <span>{strings.agenda.nextSessionBadge}</span>
      </div>

      <h3 className="agenda-hero-title">{nextEvent.title}</h3>

      <div className="agenda-hero-meta">
        <div className="agenda-meta-item">
          🕒 {strings.agenda.startsAt.replace('{time}', nextEvent.startTime)}
        </div>
        <div className="agenda-meta-item">
          ⏱️ {strings.agenda.minutesDuration.replace('{duration}', String(nextEvent.durationMins))}
        </div>
      </div>

      <div className="agenda-hero-actions">
        <button className="btn-jump-in" onClick={handleStartSession}>
          {strings.agenda.jumpIntoSessionBtn}
        </button>
      </div>
    </div>
  );
};
