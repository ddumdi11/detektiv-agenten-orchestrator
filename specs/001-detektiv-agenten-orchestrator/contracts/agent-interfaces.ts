/**
 * Internal Agent Contracts (TypeScript Interfaces)
 * These define the contracts between core agent components
 */

// ============================================================================
// Core Types (from data-model.md)
// ============================================================================

export interface Hypothesis {
  text: string;
  createdAt: Date;
}

export type SessionStatus = 'running' | 'completed' | 'failed' | 'limit-reached';

export interface Gap {
  category: 'missing_information' | 'ambiguity' | 'inconsistency' | 'vagueness';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface GapAnalysis {
  gaps: Gap[];
  completenessScore: number;  // 0-100
  requiresFollowUp: boolean;
}

export interface QuestionAnswerPair {
  sequence: number;
  question: string;
  answer: string;
  timestamp: Date;
  gapAnalysis: GapAnalysis;
  providerUsed: string;  // "provider:model"
}

export interface Contradiction {
  qaPairIndexes: [number, number];
  description: string;
}

export interface RemainingGap {
  category: string;
  description: string;
}

export interface AuditResult {
  consistencyScore: number;  // 0-100
  contradictions: Contradiction[];
  remainingGaps: RemainingGap[];
  summary: string;
}

export interface InterrogationSession {
  id: string;
  hypothesis: Hypothesis;
  startTime: Date;
  endTime?: Date;
  status: SessionStatus;
  iterationLimit: number;
  currentIteration: number;
  qaPairs: QuestionAnswerPair[];
  auditResult?: AuditResult;
  auditTrail: AuditTrailEntry[];
}

export interface AuditTrailEntry {
  timestamp: Date;
  event: 'provider_switch' | 'timeout' | 'error';
  fromProvider?: string;
  toProvider?: string;
  reason: string;
}

export interface SessionContext {
  hypothesis: string;
  qaPairs: QuestionAnswerPair[];
  currentIteration: number;
  iterationLimit: number;
}

// ============================================================================
// Detective Agent Interface (FR-007 to FR-009)
// ============================================================================

export interface DetectiveAgent {
  /**
   * Generate next question based on current interrogation context
   * @param context - Current session state
   * @returns Next question to ask witness
   * @throws Error if LLM API call fails
   */
  generateQuestion(context: SessionContext): Promise<string>;

  /**
   * Analyze witness answer for gaps, inconsistencies, ambiguities
   * @param answer - Witness's response to last question
   * @param context - Full interrogation context
   * @returns Gap analysis with follow-up decision
   */
  analyzeGaps(answer: string, context: SessionContext): Promise<GapAnalysis>;

  /**
   * Determine if interrogation is complete
   * @param context - Current session state
   * @returns true if detective is satisfied, false if more questions needed
   */
  isSatisfied(context: SessionContext): boolean;
}

// ============================================================================
// Witness Interface (FR-007)
// ============================================================================

export interface WitnessInterface {
  /**
   * Send question to witness LLM and receive response
   * @param question - Detective's question
   * @param context - Previous Q&A pairs for context
   * @returns Witness's answer
   * @throws Error if Ollama API call fails or times out
   */
  respond(question: string, context: QuestionAnswerPair[]): Promise<string>;

  /**
   * Check if witness LLM is reachable
   * @returns true if Ollama is running and responsive (FR-006)
   */
  validateConnection(): Promise<boolean>;
}

// ============================================================================
// Analysis Engine (FR-013 to FR-016)
// ============================================================================

export interface AnalysisEngine {
  /**
   * Calculate consistency score for completed interrogation
   * @param session - Completed interrogation session
   * @returns Score from 0-100 (higher = more consistent)
   */
  scoreConsistency(session: InterrogationSession): Promise<number>;

  /**
   * Identify contradictions between Q&A pairs
   * @param qaPairs - All question-answer exchanges
   * @returns Array of found contradictions
   */
  findContradictions(qaPairs: QuestionAnswerPair[]): Promise<Contradiction[]>;

  /**
   * Generate comprehensive summary from all Q&A pairs
   * @param session - Completed interrogation session
   * @returns Markdown-formatted summary
   */
  generateSummary(session: InterrogationSession): Promise<string>;

  /**
   * Create final audit result
   * @param session - Completed interrogation session
   * @returns Complete audit with score, contradictions, gaps, summary
   */
  audit(session: InterrogationSession): Promise<AuditResult>;
}

// ============================================================================
// LLM Provider Interface (Unified Cloud + Ollama abstraction)
// ============================================================================

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;  // For timeout handling
}

export interface LLMProvider {
  readonly name: string;
  readonly models: readonly string[];

  /**
   * Send chat completion request
   * @param messages - Conversation history
   * @param options - Generation parameters
   * @returns LLM response content
   * @throws Error on API failure, timeout, or rate limit
   */
  chat(messages: Message[], options?: ChatOptions): Promise<string>;

  /**
   * Validate API credentials
   * @returns true if credentials are valid and API is reachable
   */
  validateCredentials(): Promise<boolean>;

  /**
   * Check if error is a rate limit (for fallback logic)
   * @param error - Error from chat() call
   * @returns true if error is HTTP 429 rate limit
   */
  isRateLimitError(error: Error): boolean;
}

// ============================================================================
// Provider Fallback Service (FR-028, FR-028a, FR-028b, FR-028c)
// ============================================================================

export interface FallbackConfig {
  providers: LLMProvider[];
  fallbackOrder: string[];  // Provider names in preference order
}

export interface ProviderFallbackService {
  /**
   * Execute LLM call with automatic fallback on rate limit
   * @param messages - Chat messages
   * @param config - Fallback configuration
   * @param onSwitch - Callback when provider switch occurs
   * @returns LLM response and provider used
   */
  executeWithFallback(
    messages: Message[],
    config: FallbackConfig,
    onSwitch?: (from: string, to: string, reason: string) => void
  ): Promise<{ response: string; providerUsed: string }>;
}

// ============================================================================
// Session Manager (FR-021, FR-022, FR-023, FR-024)
// ============================================================================

export interface SessionListItem {
  id: string;
  hypothesis: string;
  startTime: Date;
  status: SessionStatus;
  consistencyScore?: number;
}

export interface SessionManager {
  /**
   * Save session incrementally during interrogation
   * @param session - Current session state
   */
  saveIncremental(session: InterrogationSession): Promise<void>;

  /**
   * Save completed session with audit result
   * @param session - Completed session
   */
  saveCompleted(session: InterrogationSession): Promise<void>;

  /**
   * Load specific session by ID
   * @param sessionId - UUID of session
   * @returns Full session data
   * @throws Error if session not found
   */
  loadSession(sessionId: string): Promise<InterrogationSession>;

  /**
   * List all saved sessions (metadata only)
   * @returns Array of session list items
   */
  listSessions(): Promise<SessionListItem[]>;

  /**
   * Delete session files
   * @param sessionId - UUID of session to delete
   */
  deleteSession(sessionId: string): Promise<void>;
}

// ============================================================================
// Configuration Manager (FR-030, FR-031, FR-032)
// ============================================================================

export interface ProviderCredential {
  provider: 'openai' | 'anthropic' | 'gemini';
  apiKey: string;  // Encrypted by electron-store
  model: string;
  isDefault: boolean;
}

export interface TimeoutSettings {
  cloudTimeout: number;   // 15-120 seconds
  localTimeout: number;   // 15-360 seconds
}

export interface Configuration {
  detectives: ProviderCredential[];
  witness: {
    baseUrl: string;
    model: string;
  };
  providerFallbackOrder: string[];
  timeouts: TimeoutSettings;
  defaultIterationLimit: number;
}

export interface ConfigManager {
  /**
   * Load configuration from encrypted storage
   * @returns Current app configuration
   */
  loadConfig(): Promise<Configuration>;

  /**
   * Save configuration (encrypts API keys)
   * @param config - Configuration to save
   */
  saveConfig(config: Configuration): Promise<void>;

  /**
   * Update specific provider credentials
   * @param credential - Provider API key and settings
   */
  updateCredentials(credential: ProviderCredential): Promise<void>;

  /**
   * Update timeout settings
   * @param timeouts - New timeout values
   */
  updateTimeouts(timeouts: TimeoutSettings): Promise<void>;

  /**
   * Get default detective provider
   * @returns Default provider credential
   */
  getDefaultDetective(): Promise<ProviderCredential>;
}
