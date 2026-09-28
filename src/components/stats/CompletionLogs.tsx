import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDuration, formatTimeOfDay } from '../../lib/formatUtils';
import { strings } from '../../constants/strings';
import { IconCheck } from '../ui/icons';
import { Card, PanelHeader } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';

export const CompletionLogs: React.FC = () => {
  const { state } = useApp();

  const sortedLogs = [...state.taskCompletionLogs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);

  return (
    <Card className="stats-logs-card">
      <PanelHeader title={strings.stats.completionLogsTitle} />

      <div className="task-completion-logs" id="taskCompletionLogs">
        {sortedLogs.length === 0 ? (
          <EmptyState size="sm">
            {strings.stats.emptyLogs}
          </EmptyState>
        ) : (
          sortedLogs.map(log => {
            const dStr = formatTimeOfDay(log.timestamp);
            return (
              <div key={log.id} className="log-item">
                <div className="log-item-left">
                  <IconCheck size={16} />
                  <span className="log-item-text">{log.taskText}</span>
                  <span className="log-item-tag">
                    [{log.listName || 'List'}]
                  </span>
                </div>
                <div className="log-item-right-wrap">
                  <span className="log-item-time">{formatDuration(log.durationSeconds)}</span>
                  <span className="log-item-timestamp">{dStr}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
