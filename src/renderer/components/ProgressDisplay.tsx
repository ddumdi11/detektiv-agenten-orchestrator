import React from 'react';
import type { InterrogationProgress } from '../preload';

interface ProgressDisplayProps {
  progress: InterrogationProgress | null;
  onStop: () => void;
}

export const ProgressDisplay: React.FC<ProgressDisplayProps> = ({ progress, onStop }) => {
  if (!progress) {
    return null;
  }

  const progressPercentage = (progress.currentIteration / progress.totalIterations) * 100;

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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Interrogation Progress</h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            statusColors[progress.status]
          }`}
        >
          {statusLabels[progress.status]}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>
            Iteration {progress.currentIteration} of {progress.totalIterations}
          </span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              progress.status === 'failed' ? 'bg-red-600' : 'bg-blue-600'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Current Question and Answer */}
      {progress.status === 'running' && (progress.question || progress.answer) && (
        <div className="space-y-4 mb-6">
          {progress.question && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Question:</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-gray-800">
                {progress.question}
              </div>
            </div>
          )}

          {progress.answer && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Latest Answer:</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-800">
                {progress.answer}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Findings */}
      {progress.findings.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Key Findings:</h3>
          <ul className="space-y-2">
            {progress.findings.map((finding, index) => (
              <li
                key={index}
                className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-gray-800"
              >
                <span className="font-medium text-green-700">Finding {index + 1}:</span> {finding}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stop Button (only show if running) */}
      {progress.status === 'running' && (
        <button
          onClick={onStop}
          className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-md font-medium transition-colors"
        >
          Stop Interrogation
        </button>
      )}

      {/* Session ID (for debugging) */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Session ID: <code className="bg-gray-100 px-2 py-1 rounded">{progress.sessionId}</code>
        </p>
      </div>
    </div>
  );
};
