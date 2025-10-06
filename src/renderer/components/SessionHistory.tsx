import React from 'react';
import type { SessionListItem } from '../preload';

interface SessionHistoryProps {
  sessions: SessionListItem[];
  onSelectSession: (sessionId: string) => void;
  selectedSessionId: string | null;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({
  sessions,
  onSelectSession,
  selectedSessionId,
}) => {
  const statusColors = {
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    'limit-reached': 'bg-yellow-100 text-yellow-800',
  };

  const statusLabels = {
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    'limit-reached': 'Limit Reached',
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Session History</h2>
        <p className="text-gray-500 text-center py-8">No sessions yet. Start your first interrogation!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Session History</h2>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              selectedSessionId === session.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-medium text-gray-900 truncate">{session.hypothesis}</p>
                <p className="text-sm text-gray-500 mt-1">{formatDate(session.startTime)}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  statusColors[session.status]
                }`}
              >
                {statusLabels[session.status]}
              </span>
            </div>

            <div className="flex gap-4 text-xs text-gray-600">
              <span>🔍 {session.detectiveProvider}</span>
              <span>📊 {session.currentIteration}/{session.iterationLimit} iterations</span>
              {session.endTime && (
                <span>⏱️ {calculateDuration(session.startTime, session.endTime)}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

function calculateDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const durationMs = end - start;

  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
