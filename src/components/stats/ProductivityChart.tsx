import React from 'react';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { Card, PanelHeader } from '../ui/Card';

export const ProductivityChart: React.FC = () => {
  const { state } = useApp();

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const minsPerDay = [0, 0, 0, 0, 0, 0, 0];

  state.sessionLogs.forEach(s => {
    const dayIdx = s.dayOfWeek !== undefined ? s.dayOfWeek : new Date(s.date).getDay();
    minsPerDay[dayIdx] += (s.durationMins || 25);
  });

  state.taskCompletionLogs.forEach(t => {
    const dObj = new Date(t.timestamp);
    minsPerDay[dObj.getDay()] += Math.round((t.durationSeconds || 60) / 60);
  });

  const maxMins = Math.max(...minsPerDay, 1);
  const displayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon to Sun

  return (
    <Card className="stats-chart-card">
      <PanelHeader title={strings.stats.productiveDaysTitle} />

      <div className="productive-days-chart" id="productiveDaysChart">
        {displayOrder.map(dIdx => {
          const valMins = minsPerDay[dIdx];
          const pct = Math.round((valMins / maxMins) * 100);
          const isTop = valMins === maxMins && valMins > 0;

          return (
            <div key={dIdx} className="day-bar-wrap">
              <span className="day-bar-val">{valMins}m</span>
              <div className="day-bar-track">
                <div
                  className={`day-bar-fill ${isTop ? 'top-day' : ''}`}
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="day-bar-lbl">{dayNames[dIdx]}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
