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
  witnessModel: string;
  iterationLimit: number;
  sessionId: string;
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

    try {
      // Initialize Detective Agent
      const detective = this.createDetective(config.detectiveProvider);

      // Initialize Witness Agent
      const witness = this.createWitness(config.witnessModel);

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

      // Run interrogation loop
      const result = await detective.interrogate(
        config.hypothesis,
        witness,
        config.iterationLimit
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

    this.activeSession = null;
  }

  /**
   * Create Detective Agent based on provider
   */
  private createDetective(provider: 'openai' | 'anthropic' | 'gemini'): DetectiveAgent {
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
    });
  }

  /**
   * Create Witness Agent
   */
  private createWitness(witnessModel: string): WitnessAgent {
    const apiKey = process.env.ANYTHINGLLM_API_KEY || '';
    const baseUrl = process.env.ANYTHINGLLM_BASE_URL || 'http://localhost:3001';
    const workspaceSlug = process.env.WITNESS_WORKSPACE_SLUG || '';

    if (!apiKey || !workspaceSlug) {
      throw new Error('AnythingLLM credentials not configured');
    }

    return new WitnessAgent({
      apiKey,
      baseUrl,
      workspaceSlug,
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
