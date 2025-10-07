/**
 * Interrogation Orchestrator
 * Coordinates Detective and Witness agents to conduct interrogations
 */

import { BrowserWindow } from 'electron';
import { DetectiveAgent } from '../agents/DetectiveAgent';
import { WitnessAgent } from '../agents/WitnessAgent';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface InterrogationConfig {
  hypothesis: string;
  detectiveProvider: 'openai' | 'anthropic' | 'gemini';
  witnessWorkspaceSlug: string;
  iterationLimit: number;
  sessionId: string;
  language: 'de' | 'en';
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

export class InterrogationOrchestrator {
  private mainWindow: BrowserWindow | null;
  private activeSession: string | null = null;
  private abortControllers = new Map<string, AbortController>();

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;
  }

  /**
   * Start an interrogation session
   */
  async startInterrogation(config: InterrogationConfig): Promise<void> {
    // Prevent multiple concurrent sessions
    if (this.activeSession !== null) {
      throw new Error('Another interrogation session is already running');
    }

    this.activeSession = config.sessionId;

    // Create AbortController for this session
    const abortController = new AbortController();
    this.abortControllers.set(config.sessionId, abortController);

    try {
      // Initialize Detective Agent
      const detective = this.createDetective(config.detectiveProvider, config.language);

      // Initialize Witness Agent
      const witness = this.createWitness(config.witnessWorkspaceSlug, config.language);

      // Reset chat history for new session to avoid contamination from previous sessions
      console.log('[Orchestrator] Resetting chat history for new session');
      await witness.resetChat();

      // Send initial progress event
      this.sendProgress({
        sessionId: config.sessionId,
        currentIteration: 0,
        totalIterations: config.iterationLimit,
        question: '',
        answer: '',
        findings: [],
        status: 'running',
      });

      // Run interrogation loop with abort signal
      const result = await detective.interrogate(
        config.hypothesis,
        witness,
        config.iterationLimit,
        abortController.signal
      );

      // Send completion progress
      this.sendProgress({
        sessionId: config.sessionId,
        currentIteration: config.iterationLimit,
        totalIterations: config.iterationLimit,
        question: '',
        answer: '',
        findings: result.findings,
        status: 'completed',
      });

      this.activeSession = null;
      // Cleanup abort controller
      this.abortControllers.delete(config.sessionId);
    } catch (error) {
      // Send failure progress
      this.sendProgress({
        sessionId: config.sessionId,
        currentIteration: 0,
        totalIterations: config.iterationLimit,
        question: '',
        answer: '',
        findings: [],
        status: 'failed',
      });

      this.activeSession = null;
      // Cleanup abort controller
      this.abortControllers.delete(config.sessionId);
      throw error;
    }
  }

  /**
   * Stop the active interrogation session
   */
  stopInterrogation(sessionId: string): void {
    if (this.activeSession !== sessionId) {
      throw new Error('No matching active session to stop');
    }

    // IMPORTANT: Clear activeSession IMMEDIATELY to allow new sessions to start
    this.activeSession = null;

    // Abort the interrogation using the AbortController
    const abortController = this.abortControllers.get(sessionId);
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(sessionId);
    }

    // Send cancellation progress
    this.sendProgress({
      sessionId,
      currentIteration: 0,
      totalIterations: 0,
      question: '',
      answer: '',
      findings: [],
      status: 'failed',
    });
  }

  /**
   * Create Detective Agent based on provider
   */
  private createDetective(provider: 'openai' | 'anthropic' | 'gemini', language: 'de' | 'en'): DetectiveAgent {
    let apiKey: string;
    let model: string;

    switch (provider) {
      case 'anthropic':
        apiKey = process.env.ANTHROPIC_API_KEY || '';
        model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
        break;
      case 'openai':
        apiKey = process.env.OPENAI_API_KEY || '';
        model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        break;
      case 'gemini':
        throw new Error('Gemini provider not yet implemented');
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    if (!apiKey) {
      throw new Error(`API key not configured for provider: ${provider}`);
    }

    return new DetectiveAgent({
      provider,
      apiKey,
      model,
      initialStrategy: 'depth-first',
      language,
    });
  }

  /**
   * Create Witness Agent
   */
  private createWitness(witnessWorkspaceSlug: string, language: 'de' | 'en'): WitnessAgent {
    const apiKey = process.env.ANYTHINGLLM_API_KEY || '';
    const baseUrl = process.env.ANYTHINGLLM_BASE_URL || 'http://localhost:3001';
    // Use witnessWorkspaceSlug parameter as workspace slug, fall back to env var
    const workspaceSlug = witnessWorkspaceSlug || process.env.WITNESS_WORKSPACE_SLUG || '';

    if (!apiKey || !workspaceSlug) {
      throw new Error('AnythingLLM credentials not configured');
    }

    return new WitnessAgent({
      apiKey,
      baseUrl,
      workspaceSlug,
      language,
    });
  }

  /**
   * Send progress event to renderer process
   */
  private sendProgress(progress: InterrogationProgress): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('interrogation:progress', progress);
    }
  }

  /**
   * Check if a session is currently active
   */
  isSessionActive(sessionId: string): boolean {
    return this.activeSession === sessionId;
  }

  /**
   * Get the active session ID
   */
  getActiveSessionId(): string | null {
    return this.activeSession;
  }
}
