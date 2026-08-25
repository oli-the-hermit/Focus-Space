import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDuration } from '../../lib/formatUtils';
import { strings } from '../../constants/strings';

export const CompletionLogs: React.FC = () => {
  const { state } = useApp();

  const sortedLogs = [...state.taskCompletionLogs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);

  return (
    <div className="card stats-logs-card">
      <div className="panel-card-header">
        <span className="panel-card-title">{strings.stats.completionLogsTitle}</span>
      </div>

      <div className="task-completion-logs" id="taskCompletionLogs">
        {sortedLogs.length === 0 ? (
          <div className="empty-state small">
            {strings.stats.emptyLogs}
          </div>
        ) : (
          sortedLogs.map(log => {
            const dStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={log.id} className="log-item">
                <div className="log-item-left">
                  <span>✅</span>
                  <span className="log-item-text">{log.taskText}</span>
                  <span className="log-item-tag">
                    [{log.listName || 'List'}]
                  </span>
                </div>
                <div className="log-item-right-wrap">
                  <span className="log-item-time">⏱️ {formatDuration(log.durationSeconds)}</span>
                  <span className="log-item-timestamp">{dStr}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
