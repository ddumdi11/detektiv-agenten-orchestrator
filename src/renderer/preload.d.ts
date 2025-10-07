/**
 * TypeScript definitions for window.electronAPI
 * Exposes IPC methods to renderer process via Context Bridge
 */

export interface ElectronAPI {
  interrogation: {
    start: (args: {
      hypothesis: string;
      iterationLimit: number;
      detectiveProvider: 'openai' | 'anthropic' | 'gemini';
      witnessWorkspaceSlug: string;
      language: 'de' | 'en';
    }) => Promise<{ sessionId: string; status: string }>;

    stop: (sessionId: string) => Promise<{ status: string; partialResults: any }>;

    getStatus: (sessionId: string) => Promise<{
      currentIteration: number;
      qaPairs: any[];
      status: string;
    }>;

    onProgress: (callback: (progress: InterrogationProgress) => void) => () => void;
  };

  sessions: {
    list: () => Promise<{ sessions: SessionListItem[] }>;
    load: (sessionId: string) => Promise<InterrogationSession>;
  };

  config: {
    updateCredentials: (args: {
      provider: 'openai' | 'anthropic' | 'gemini';
      apiKey: string;
      model: string;
    }) => Promise<{ status: string }>;

    getDefaultDetective: () => Promise<string | null>;
    getDefaultWitness: () => Promise<string>;
    getRaw: () => Promise<string>;
  };
}

export interface InterrogationProgress {
  sessionId: string;
  currentIteration: number;
  totalIterations: number;
  question: string;
  answer: string;
  findings: string[];
  status: 'running' | 'completed' | 'failed' | 'limit-reached';
}

export interface SessionListItem {
  id: string;
  hypothesis: string;
  startTime: string;
  status: string;
  consistencyScore?: number;
}

export interface InterrogationSession {
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
  witnessWorkspaceSlug: string;
  language: 'de' | 'en';
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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
