/**
 * Shared constants for session status display
 */

export const STATUS_COLORS = {
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  'limit-reached': 'bg-yellow-100 text-yellow-800',
} as const;

export const STATUS_LABELS = {
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  'limit-reached': 'Limit Reached',
} as const;