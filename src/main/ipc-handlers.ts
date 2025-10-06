/**
 * IPC Handler implementations
 * These handlers process requests from the renderer process
 */

import { IpcMainInvokeEvent, BrowserWindow } from 'electron';
import { randomUUID } from 'crypto';
import { InterrogationOrchestrator } from './InterrogationOrchestrator';

// In-memory session store (temporary - will be replaced with proper storage)
interface InterrogationSession {
  id: string;
  hypothesis: {
    text: string;
    createdAt: string;
  };
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed' | 'limit-reached';
  iterationLimit: number;
  currentIteration: number;
  detectiveProvider: 'openai' | 'anthropic' | 'gemini';
  witnessModel: string;
  qaPairs: Array<{
    sequence: number;
    question: string;
    answer: string;
    timestamp: string;
    providerUsed?: string;
    gapAnalysis?: {
      gaps: Array<{ category: string; description: string }>;
      completenessScore: number;
      requiresFollowUp: boolean;
    };
  }>;
  auditTrail: Array<{
    timestamp: string;
    event: 'provider_switch' | 'timeout' | 'error';
    reason: string;
  }>;
  auditResult?: {
    consistencyScore: number;
    contradictions: Array<{ description: string; locations: string[] }>;
    remainingGaps: string[];
    summary: string;
  };
}

const sessions = new Map<string, InterrogationSession>();

// Export for testing - allows tests to clear state between runs
export const clearSessions = () => sessions.clear();

// Global orchestrator instance (will be initialized when window is created)
let orchestrator: InterrogationOrchestrator | null = null;

// Initialize orchestrator with main window
export const initializeOrchestrator = (mainWindow: BrowserWindow) => {
  orchestrator = new InterrogationOrchestrator(mainWindow);
};

// Helper: Validate UUID format
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const ipcHandlers = {
  'interrogation:start': async (event: IpcMainInvokeEvent, args: any) => {
    // Validate request
    if (!args || typeof args !== 'object') {
      throw new Error('Request body is required');
    }

    const { hypothesis, iterationLimit, detectiveProvider, witnessModel } = args;

    // Validate hypothesis
    if (hypothesis === undefined || hypothesis === null) {
      throw new Error('hypothesis is required');
    }
    if (typeof hypothesis !== 'string' || hypothesis.trim() === '') {
      throw new Error('hypothesis cannot be empty');
    }

    // Validate iterationLimit
    if (iterationLimit === undefined || iterationLimit === null) {
      throw new Error('iterationLimit is required');
    }
    if (typeof iterationLimit !== 'number') {
      throw new Error('iterationLimit must be a number');
    }
    if (iterationLimit < 5) {
      throw new Error('iterationLimit must be at least minimum 5');
    }
    if (iterationLimit > 20) {
      throw new Error('iterationLimit must not exceed maximum 20');
    }

    // Validate detectiveProvider
    const validProviders = ['openai', 'anthropic', 'gemini'];
    if (!detectiveProvider) {
      throw new Error('detectiveProvider is required');
    }
    if (!validProviders.includes(detectiveProvider)) {
      throw new Error('detectiveProvider is invalid (must be openai, anthropic, or gemini)');
    }

    // Validate witnessModel
    if (!witnessModel) {
      throw new Error('witnessModel is required');
    }

    // Check if another session is already running (FR-029)
    const runningSessions = Array.from(sessions.values()).filter(s => s.status === 'running');
    if (runningSessions.length > 0) {
      throw new Error('Another interrogation session is already running');
    }

    // Ensure orchestrator is ready before creating session (prevents phantom sessions)
    if (!orchestrator) {
      throw new Error('Orchestrator not initialized - main window may not be ready');
    }

    // Create new session
    const sessionId = randomUUID();
    const session: InterrogationSession = {
      id: sessionId,
      hypothesis: {
        text: hypothesis,
        createdAt: new Date().toISOString(),
      },
      startTime: new Date().toISOString(),
      status: 'running',
      iterationLimit,
      currentIteration: 0,
      detectiveProvider,
      witnessModel,
      qaPairs: [],
      auditTrail: [],
    };

    sessions.set(sessionId, session);

    orchestrator.startInterrogation({
        hypothesis,
        detectiveProvider,
        witnessModel,
        iterationLimit,
        sessionId,
      })
        .then((result) => {
          // Update session on successful completion
          const completedSession = sessions.get(sessionId);
          if (!completedSession) {
            // Race condition: session was deleted or never created
            console.warn('[Orchestrator] Completion handler: session not found', {
              sessionId,
              reason: 'Session missing after orchestration completed',
            });
            return;
          }

          completedSession.status = 'completed';
          completedSession.endTime = new Date().toISOString();

          // TODO: Update InterrogationOrchestrator.startInterrogation() to return
          // { actualIterationCount: number } so we can use the real count instead
          // of assuming iterationLimit. For now, fall back to iterationLimit.
          completedSession.currentIteration = iterationLimit;

          // Note: auditTrail is for exceptional events only (provider_switch, timeout, error)
          // Normal completion doesn't need an audit entry
        })
        .catch((error) => {
          // Update session on error
          const failedSession = sessions.get(sessionId);
          if (failedSession) {
            failedSession.status = 'failed';
            failedSession.endTime = new Date().toISOString();
            failedSession.auditTrail.push({
              timestamp: new Date().toISOString(),
              event: 'error',
              reason: error.message || 'Unknown error',
            });
          }
        });

    return {
      sessionId,
      status: 'running',
    };
  },

  'interrogation:status': async (event: IpcMainInvokeEvent, sessionId: any) => {
    // Validate sessionId
    if (!sessionId) {
      throw new Error('sessionId is required');
    }
    if (typeof sessionId !== 'string' || !isValidUUID(sessionId)) {
      throw new Error('sessionId is invalid UUID');
    }

    // Find session
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Return status information
    return {
      currentIteration: session.currentIteration,
      qaPairs: session.qaPairs,
      status: session.status,
    };
  },

  'sessions:load': async (event: IpcMainInvokeEvent, sessionId: any) => {
    // Validate sessionId
    if (!sessionId) {
      throw new Error('sessionId is required');
    }
    if (typeof sessionId !== 'string' || !isValidUUID(sessionId)) {
      throw new Error('sessionId is invalid UUID');
    }

    // Find session
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Return complete session data
    return session;
  },

  'sessions:list': async (event: IpcMainInvokeEvent) => {
    // Filter sessions: only completed, failed, or limit-reached (not running)
    const finishedSessions = Array.from(sessions.values())
      .filter((s) => s.status !== 'running')
      .sort((a, b) => {
        // Sort by startTime descending (newest first)
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      })
      .map((session) => {
        // Map to SessionListItem format
        const listItem: any = {
          id: session.id,
          hypothesis: session.hypothesis.text,
          startTime: session.startTime,
          status: session.status,
        };

        // Include consistencyScore only for completed sessions
        if (session.status === 'completed' && session.auditResult) {
          listItem.consistencyScore = session.auditResult.consistencyScore;
        }

        return listItem;
      });

    return {
      sessions: finishedSessions,
    };
  },

  'config:updateCredentials': async (event: IpcMainInvokeEvent, args: any) => {
    // Validate request
    if (!args || typeof args !== 'object') {
      throw new Error('Request body is required');
    }

    const { provider, apiKey, model } = args;

    // Validate provider
    const validProviders = ['openai', 'anthropic', 'gemini'];
    if (!provider) {
      throw new Error('provider is required');
    }
    if (!validProviders.includes(provider)) {
      throw new Error('provider is invalid');
    }

    // Validate apiKey
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
      throw new Error('apiKey is required');
    }
    if (apiKey.length < 20) {
      throw new Error('apiKey must have minLength 20 characters');
    }

    // Validate model
    if (!model || typeof model !== 'string') {
      throw new Error('model is required');
    }

    // TODO: Implement actual credential encryption and storage
    return {
      status: 'success',
    };
  },

  'config:getDefaultDetective': async (event: IpcMainInvokeEvent) => {
    // TODO: Implement actual default provider retrieval from config
    // For now, return null (no default set)
    return null;
  },

  'config:getDefaultWitness': async (event: IpcMainInvokeEvent) => {
    // Return default witness workspace slug from environment
    return process.env.WITNESS_WORKSPACE_SLUG || '';
  },

  'config:getRaw': async (event: IpcMainInvokeEvent) => {
    // TODO: Implement actual config file reading
    // For now, return mock encrypted config
    return JSON.stringify({
      credentials: {
        openai: {
          apiKey: 'ENCRYPTED_KEY_PLACEHOLDER',
          model: 'gpt-4o',
        },
      },
    });
  },

  'interrogation:stop': async (event: IpcMainInvokeEvent, args: any) => {
    // Validate request
    if (!args || typeof args !== 'object') {
      throw new Error('Request body is required');
    }

    const { sessionId } = args;

    // Validate sessionId
    if (!sessionId) {
      throw new Error('sessionId is required');
    }
    if (typeof sessionId !== 'string' || !isValidUUID(sessionId)) {
      throw new Error('sessionId is invalid UUID');
    }

    // Find session
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Check if session is running
    if (session.status !== 'running') {
      throw new Error('Session is not running');
    }

    // Stop orchestrator if running
    if (orchestrator) {
      orchestrator.stopInterrogation(sessionId);
    }

    // Update session status
    session.status = 'failed';
    session.endTime = new Date().toISOString();

    return {
      status: 'failed',
      partialResults: session,
    };
  },
};
