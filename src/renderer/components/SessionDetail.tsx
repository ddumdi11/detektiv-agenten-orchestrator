import React from 'react';
import type { InterrogationSession } from '../preload';
import { STATUS_COLORS, STATUS_LABELS } from '../constants/session-status';
import { calculateDuration } from '../utils/duration';

interface SessionDetailProps {
  session: InterrogationSession | null;
  onClose: () => void;
}

export const SessionDetail: React.FC<SessionDetailProps> = ({ session, onClose }) => {
  if (!session) {
    return null;
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getDuration = () => {
    if (!session.endTime) return 'In progress...';
    return calculateDuration(session.startTime, session.endTime);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Details</h2>
              <p className="text-sm text-gray-500">ID: {session.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Timing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  STATUS_COLORS[session.status as keyof typeof STATUS_COLORS]
                }`}
              >
                {STATUS_LABELS[session.status as keyof typeof STATUS_LABELS]}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Duration</h3>
              <p className="text-gray-900">{getDuration()}</p>
            </div>
          </div>

          {/* Hypothesis */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Hypothesis</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-gray-900">{session.hypothesis.text}</p>
              <p className="text-xs text-gray-500 mt-2">
                Created: {formatDate(session.hypothesis.createdAt)}
              </p>
            </div>
          </div>

          {/* Configuration */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Configuration</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Detective Provider</p>
                <p className="font-medium text-gray-900">{session.detectiveProvider}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Witness Workspace</p>
                <p className="font-medium text-gray-900">{session.witnessWorkspaceSlug}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Iteration Limit</p>
                <p className="font-medium text-gray-900">{session.iterationLimit}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Current Iteration</p>
                <p className="font-medium text-gray-900">{session.currentIteration}</p>
              </div>
            </div>
          </div>

          {/* Q&A Pairs */}
          {session.qaPairs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Question & Answer History ({session.qaPairs.length})
              </h3>
              <div className="space-y-4">
                {session.qaPairs.map((qa, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4">
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Question {index + 1}:</p>
                      <p className="text-gray-900 bg-blue-50 p-3 rounded">{qa.question}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Answer:</p>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded">{qa.answer}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{formatDate(qa.timestamp)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Trail */}
          {session.auditTrail.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Audit Trail ({session.auditTrail.length})
              </h3>
              <div className="space-y-2">
                {session.auditTrail.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 text-sm border-l-2 border-gray-300 pl-3 py-1"
                  >
                    <span className="text-gray-500 font-mono text-xs whitespace-nowrap">
                      {formatDate(entry.timestamp)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        entry.event === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {entry.event}
                    </span>
                    <span className="text-gray-700 flex-1">{entry.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timing Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Timing</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Started:</span>
                <span className="font-medium text-gray-900">{formatDate(session.startTime)}</span>
              </div>
              {session.endTime && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Ended:</span>
                  <span className="font-medium text-gray-900">{formatDate(session.endTime)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
