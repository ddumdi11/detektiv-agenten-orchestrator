import React from 'react';
import type { InterrogationProgress } from '../preload';
import { STATUS_COLORS, STATUS_LABELS } from '../constants/session-status';

interface ProgressDisplayProps {
  progress: InterrogationProgress | null;
  onStop: () => void;
}

export const ProgressDisplay: React.FC<ProgressDisplayProps> = ({ progress, onStop }) => {
  if (!progress) {
    return null;
  }

  // Guard against division by zero and clamp to 0-100 range
  const progressPercentage = progress.totalIterations > 0
    ? Math.min(100, Math.max(0, (progress.currentIteration / progress.totalIterations) * 100))
    : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Interrogation Progress</h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            STATUS_COLORS[progress.status as keyof typeof STATUS_COLORS]
          }`}
        >
          {STATUS_LABELS[progress.status as keyof typeof STATUS_LABELS]}
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

      {/* Complete Q&A History */}
      {progress.qaPairs && progress.qaPairs.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Question & Answer History ({progress.qaPairs.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {progress.qaPairs.map((qa, index) => (
              <div key={index} className="border border-gray-200 rounded-md p-3">
                <div className="mb-2">
                  <p className="text-xs text-gray-500 mb-1">Question {qa.sequence}:</p>
                  <p className="text-gray-900 bg-blue-50 p-2 rounded text-sm">{qa.question}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Answer:</p>
                  <p className="text-gray-900 bg-gray-50 p-2 rounded text-sm">{qa.answer}</p>
                </div>
              </div>
            ))}
          </div>
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
