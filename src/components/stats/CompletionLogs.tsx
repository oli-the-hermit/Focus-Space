import React from 'react';
import { useApp } from '../../context/AppContext';

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

export const CompletionLogs: React.FC = () => {
  const { state } = useApp();

  const sortedLogs = [...state.taskCompletionLogs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);

  return (
    <div className="card stats-logs-card">
      <div className="panel-card-header">
        <span className="panel-card-title">⏱️ Task Completion Log</span>
      </div>

      <div className="task-completion-logs" id="taskCompletionLogs">
        {sortedLogs.length === 0 ? (
          <div className="empty-state small">
            No tasks completed yet. Check off tasks during sessions to see timing stats!
          </div>
        ) : (
          sortedLogs.map(log => {
            const dStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={log.id} className="log-item">
                <div className="log-item-left">
                  <span>✅</span>
                  <span style={{ fontWeight: 600 }}>{log.taskText}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    [{log.listName || 'List'}]
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="log-item-time">⏱️ {formatDuration(log.durationSeconds)}</span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{dStr}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
