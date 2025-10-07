/**
 * IPC Handler implementations
 * These handlers process requests from the renderer process
 */

import { IpcMainInvokeEvent, BrowserWindow, app } from 'electron';
import { randomUUID } from 'crypto';
import { InterrogationOrchestrator } from './InterrogationOrchestrator';
import { DocumentLoader } from '../services/DocumentLoader';
import { TextSplitter } from '../services/TextSplitter';
import { EmbeddingService } from '../services/EmbeddingService';
import { VectorStoreManager } from '../services/VectorStoreManager';
import type { DocumentSource } from '../renderer/preload';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
  witnessMode: 'anythingllm' | 'langchain';
  witnessWorkspaceSlug?: string;
  documentPath?: string;
  ollamaBaseUrl?: string;
  chromaBaseUrl?: string;
  collectionName?: string;
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

const sessions = new Map<string, InterrogationSession>();
const documents = new Map<string, DocumentSource>();

// Export for testing - allows tests to clear state between runs
export const clearSessions = () => sessions.clear();
export const clearDocuments = () => documents.clear();

// Background document processing function
async function processDocument(documentId: string) {
  const document = documents.get(documentId);
  if (!document) return;

  try {
    console.log(`[DocumentProcessor] Starting processing for document: ${document.filename}`);

    // Update status to processing
    document.embeddingStatus = 'processing';
    document.embeddingProgress = 10;

    // Initialize services with default settings
    const documentLoader = new DocumentLoader();
    const textSplitter = new TextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const embeddingService = new EmbeddingService({
      baseUrl: 'http://localhost:11434',
      model: 'nomic-embed-text',
      batchSize: 10,
    });

    // Create embeddings instance for vector store
    const { OllamaEmbeddings } = await import('@langchain/community/embeddings/ollama');
    const embeddings = new OllamaEmbeddings({
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    });

    const vectorStoreManager = new VectorStoreManager(embeddings, {
      url: 'http://localhost:8000',
      collectionName: document.vectorStoreCollectionId,
    });

    // Step 1: Load document
    document.embeddingProgress = 20;
    console.log(`[DocumentProcessor] Loading document: ${document.filePath}`);
    const docs = await documentLoader.loadDocument(document.filePath);

    // Step 2: Split into chunks
    document.embeddingProgress = 40;
    console.log(`[DocumentProcessor] Splitting into chunks`);
    const chunks = await textSplitter.splitDocuments(docs);
    document.chunkCount = chunks.length;

    // Calculate total tokens (rough estimate)
    document.totalTokens = chunks.reduce((sum, chunk) => sum + chunk.pageContent.length, 0);

    // Step 3: Initialize vector store
    document.embeddingProgress = 60;
    console.log(`[DocumentProcessor] Initializing vector store`);
    await vectorStoreManager.initialize();

    // Step 4: Store in vector database
    document.embeddingProgress = 80;
    console.log(`[DocumentProcessor] Storing ${chunks.length} chunks in vector store`);
    await vectorStoreManager.addDocuments(chunks);

    // Complete
    document.embeddingProgress = 100;
    document.embeddingStatus = 'completed';

    console.log(`[DocumentProcessor] Document processing completed: ${document.filename}`);
  } catch (error) {
    console.error(`[DocumentProcessor] Processing failed for ${document.filename}:`, error);
    document.embeddingStatus = 'failed';
    document.embeddingError = error instanceof Error ? error.message : 'Unknown error';
  }
}

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

    const { hypothesis, iterationLimit, detectiveProvider, witnessMode, witnessWorkspaceSlug, documentPath, ollamaBaseUrl, chromaBaseUrl, collectionName, language } = args;

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

    // Validate witnessMode
    const validWitnessModes = ['anythingllm', 'langchain'];
    if (!witnessMode) {
      throw new Error('witnessMode is required');
    }
    if (!validWitnessModes.includes(witnessMode)) {
      throw new Error('witnessMode is invalid (must be anythingllm or langchain)');
    }

    // Validate mode-specific parameters
    if (witnessMode === 'anythingllm') {
      if (!witnessWorkspaceSlug) {
        throw new Error('witnessWorkspaceSlug is required for anythingllm mode');
      }
    } else if (witnessMode === 'langchain') {
      if (!documentPath) {
        throw new Error('documentPath is required for langchain mode');
      }
    }

    // Validate language
    const validLanguages = ['de', 'en'];
    if (!language) {
      throw new Error('language is required');
    }
    if (!validLanguages.includes(language)) {
      throw new Error('language is invalid (must be de or en)');
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
      witnessMode,
      witnessWorkspaceSlug,
      documentPath,
      ollamaBaseUrl,
      chromaBaseUrl,
      collectionName,
      language,
      qaPairs: [],
      auditTrail: [],
    };

    sessions.set(sessionId, session);

    orchestrator.startInterrogation({
        hypothesis,
        detectiveProvider,
        witnessMode,
        witnessWorkspaceSlug,
        documentPath,
        ollamaBaseUrl,
        chromaBaseUrl,
        collectionName,
        iterationLimit,
        sessionId,
        language,
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
          endTime: session.endTime,
          status: session.status,
          detectiveProvider: session.detectiveProvider,
          currentIteration: session.currentIteration,
          iterationLimit: session.iterationLimit,
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

  'documents:upload': async (event: IpcMainInvokeEvent, fileData: any) => {
    console.log('[IPC] Starting document upload:', fileData.name);

    // Validate file data
    if (!fileData || !fileData.data) {
      throw new Error('File data is required');
    }

    // Create temporary file path in user data directory (writable in production)
    const userDataDir = app.getPath('userData');
    const tempDir = path.join(userDataDir, 'temp-documents');
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    } catch (error) {
      console.error('[IPC] Failed to create temp directory:', error);
      // Fallback to system temp directory
      const fallbackDir = path.join(os.tmpdir(), 'detektiv-agenten-temp');
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      throw new Error(`Cannot create temp directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const filePath = path.join(tempDir, `${randomUUID()}-${fileData.name}`);

    // Save file to disk
    const buffer = Buffer.from(fileData.data);
    fs.writeFileSync(filePath, buffer);

    // Determine file type from MIME type or extension
    let fileType: 'pdf' | 'txt' | 'docx' = 'txt';
    if (fileData.type.includes('pdf')) {
      fileType = 'pdf';
    } else if (fileData.type.includes('docx') || fileData.name.toLowerCase().endsWith('.docx')) {
      fileType = 'docx';
    }

    // Create document record
    const documentId = randomUUID();
    const document: DocumentSource = {
      id: documentId,
      workspaceId: 'default-workspace', // In a real app, this would be configurable
      filePath,
      filename: fileData.name,
      fileType,
      fileSizeBytes: fileData.size,
      uploadTimestamp: new Date().toISOString(),
      embeddingStatus: 'pending',
      embeddingProgress: 0,
      chunkCount: 0,
      totalTokens: 0,
      vectorStoreCollectionId: `doc-${documentId}`,
    };

    documents.set(documentId, document);

    // Start background processing
    processDocument(documentId);

    console.log('[IPC] Document uploaded:', documentId);
    return document;
  },

  'documents:list': async (event: IpcMainInvokeEvent) => {
    return { documents: Array.from(documents.values()) };
  },

  'documents:delete': async (event: IpcMainInvokeEvent, documentId: string) => {
    if (!documentId) {
      throw new Error('documentId is required');
    }

    const document = documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Delete file from disk
    try {
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }
    } catch (error) {
      console.warn('[IPC] Failed to delete file:', error);
    }

    // Remove from storage
    documents.delete(documentId);

    console.log('[IPC] Document deleted:', documentId);
  },

  'documents:getProgress': async (event: IpcMainInvokeEvent, documentId: string) => {
    if (!documentId) {
      throw new Error('documentId is required');
    }

    const document = documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    return {
      progress: document.embeddingProgress,
      status: document.embeddingStatus,
    };
  },

  'rag:getSettings': async (event: IpcMainInvokeEvent) => {
    // TODO: Implement loading RAG settings from storage
    // For now, return default settings
    return {
      chunkSize: 1000,
      chunkOverlap: 200,
      embeddingModel: 'nomic-embed-text',
      ollamaBaseUrl: 'http://localhost:11434',
      embeddingBatchSize: 10,
      chromaBaseUrl: 'http://localhost:8000',
      retrievalK: 5,
      scoreThreshold: 0,
      generationModel: 'qwen2.5:7b',
      generationTemperature: 0.1,
    };
  },

  'rag:saveSettings': async (event: IpcMainInvokeEvent, settings: any) => {
    // TODO: Implement saving RAG settings to storage
    console.log('[IPC] Saving RAG settings:', settings);
    // Validate settings
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings object is required');
    }

    // Basic validation
    if (typeof settings.chunkSize !== 'number' || settings.chunkSize < 500 || settings.chunkSize > 2000) {
      throw new Error('chunkSize must be between 500 and 2000');
    }
    if (typeof settings.chunkOverlap !== 'number' || settings.chunkOverlap < 0 || settings.chunkOverlap > 500) {
      throw new Error('chunkOverlap must be between 0 and 500');
    }
    if (typeof settings.retrievalK !== 'number' || settings.retrievalK < 1 || settings.retrievalK > 20) {
      throw new Error('retrievalK must be between 1 and 20');
    }

    // TODO: Save to persistent storage (file, database, etc.)
    return { status: 'success' };
  },
};
