/**
 * Witness Agent - Dual-mode RAG implementation
 * Supports both AnythingLLM (quick-start) and LangChain (advanced) modes
 */

import { DocumentLoader } from '../services/DocumentLoader';
import { TextSplitter } from '../services/TextSplitter';
import { EmbeddingService } from '../services/EmbeddingService';
import { VectorStoreManager } from '../services/VectorStoreManager';

interface WitnessAgentConfig {
  mode: 'anythingllm' | 'langchain';
  language?: 'de' | 'en';

  // AnythingLLM mode config
  anythingllm?: {
    apiKey: string;
    baseUrl: string;
    workspaceSlug: string;
  };

  // LangChain mode config
  langchain?: {
    documentPath: string;
    ollamaBaseUrl: string;
    chromaBaseUrl: string;
    collectionName: string;
  };
}

export class WitnessAgent {
  private mode: 'anythingllm' | 'langchain';
  private language: 'de' | 'en';

  // AnythingLLM mode properties
  private apiKey?: string;
  private baseUrl?: string;
  private workspaceSlug?: string;
  private sessionId?: string;
  private isFirstQuestion: boolean = true;

  // LangChain mode properties
  private documentLoader?: DocumentLoader;
  private textSplitter?: TextSplitter;
  private embeddingService?: EmbeddingService;
  private vectorStoreManager?: VectorStoreManager;
  private documentProcessed: boolean = false;
  private langchainConfig?: NonNullable<WitnessAgentConfig['langchain']>;

  constructor(config: WitnessAgentConfig) {
    this.mode = config.mode;
    this.language = config.language || 'en';

    if (this.mode === 'anythingllm') {
      this.initializeAnythingLLM(config.anythingllm!);
    } else if (this.mode === 'langchain') {
      this.initializeLangChain(config.langchain!);
    } else {
      throw new Error(`Invalid mode: ${this.mode}. Must be 'anythingllm' or 'langchain'`);
    }
  }

  private initializeAnythingLLM(config: NonNullable<WitnessAgentConfig['anythingllm']>) {
    // Validate configuration
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('apiKey is required for AnythingLLM mode');
    }
    if (!config.workspaceSlug || config.workspaceSlug.trim() === '') {
      throw new Error('workspaceSlug is required for AnythingLLM mode');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'http://localhost:3001';
    this.workspaceSlug = config.workspaceSlug;
    // Generate unique session ID for this witness instance
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  private initializeLangChain(config: NonNullable<WitnessAgentConfig['langchain']>) {
    // Validate configuration
    if (!config.documentPath || config.documentPath.trim() === '') {
      throw new Error('documentPath is required for LangChain mode');
    }
    if (!config.ollamaBaseUrl || config.ollamaBaseUrl.trim() === '') {
      throw new Error('ollamaBaseUrl is required for LangChain mode');
    }
    if (!config.chromaBaseUrl || config.chromaBaseUrl.trim() === '') {
      throw new Error('chromaBaseUrl is required for LangChain mode');
    }
    if (!config.collectionName || config.collectionName.trim() === '') {
      throw new Error('collectionName is required for LangChain mode');
    }

    // Store config for later use
    this.langchainConfig = config;

    // Initialize LangChain services
    this.documentLoader = new DocumentLoader();
    this.textSplitter = new TextSplitter();
    this.embeddingService = new EmbeddingService({
      baseUrl: config.ollamaBaseUrl,
    });

    // Create embeddings instance for vector store
    const { OllamaEmbeddings } = require('@langchain/community/embeddings/ollama');
    const embeddings = new OllamaEmbeddings({
      model: 'nomic-embed-text',
      baseUrl: config.ollamaBaseUrl,
    });

    this.vectorStoreManager = new VectorStoreManager(embeddings, {
      url: config.chromaBaseUrl,
      collectionName: config.collectionName,
    });
  }

  /**
   * Get system prompt for the witness role
   */
  private getSystemPrompt(): string {
    if (this.language === 'de') {
      return `Du bist ein Zeuge in einem Verhör. Dein Wissen basiert NUR auf dem Dokument, das dir zur Verfügung steht.

WICHTIG:
- Antworte IMMER in der ICH-Form ("Ich weiß...", "Ich habe gelesen...", "Im Dokument steht...")
- NIEMALS in der 3. Person über "den Zeugen" sprechen
- Wenn etwas nicht im Dokument steht: "Das steht nicht im Dokument." oder "Das weiß ich nicht."
- KEIN Spekulieren über Dateinamen, Meta-Informationen oder Quellen außerhalb des Dokumentinhalts
- NUR Antworten basierend auf dem tatsächlichen Dokumentinhalt

Beispiele für GUTE Antworten:
- "Ich habe im Dokument gelesen, dass..."
- "Das steht nicht im Dokument."
- "Im Text wird erwähnt, dass..."

Beispiele für SCHLECHTE Antworten (NIEMALS so antworten):
- "Der Zeuge sagt..." ❌
- "Der Text erwähnt..." ❌ (stattdessen: "Im Text steht...")
- "Der Zeuge kennt den Namen aus..." ❌`;
    } else {
      return `You are a witness in an interrogation. Your knowledge is based ONLY on the document available to you.

IMPORTANT:
- ALWAYS answer in the FIRST PERSON ("I know...", "I read...", "The document states...")
- NEVER speak in the 3rd person about "the witness"
- If something is not in the document: "That is not in the document." or "I don't know that."
- NO speculation about filenames, meta-information, or sources outside the document content
- ONLY answers based on the actual document content

Examples of GOOD answers:
- "I read in the document that..."
- "That is not in the document."
- "The text mentions that..."

Examples of BAD answers (NEVER answer like this):
- "The witness says..." ❌
- "The text mentions..." ❌ (instead: "The document states...")
- "The witness knows the name from..." ❌`;
    }
  }

  /**
   * Reset chat history for a new interrogation session
   * Generates a new session ID to start fresh (AnythingLLM) or resets document processing (LangChain)
   */
  async resetChat(): Promise<void> {
    console.log(`[WitnessAgent] Resetting chat for mode: ${this.mode}`);

    if (this.mode === 'anythingllm') {
      // Generate new session ID for fresh start
      this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      this.isFirstQuestion = true;
      console.log(`[WitnessAgent] New session ID: ${this.sessionId}`);
    } else if (this.mode === 'langchain') {
      // Reset document processing for fresh RAG
      this.documentProcessed = false;
      console.log(`[WitnessAgent] Document processing reset - will reprocess on next question`);
    }
  }

  /**
   * Ask a question to the witness
   * Routes to appropriate method based on mode
   */
  async ask(question: string): Promise<string> {
    if (this.mode === 'anythingllm') {
      return this.askAnythingLLM(question);
    } else if (this.mode === 'langchain') {
      return this.askLangChain(question);
    } else {
      throw new Error(`Invalid mode: ${this.mode}`);
    }
  }

  /**
   * Ask a question to the witness (AnythingLLM workspace)
   */
  private async askAnythingLLM(question: string): Promise<string> {
    if (!this.apiKey || !this.baseUrl || !this.workspaceSlug || !this.sessionId) {
      throw new Error('AnythingLLM configuration not initialized');
    }

    const url = `${this.baseUrl}/api/v1/workspace/${this.workspaceSlug}/chat`;

    console.log(`[WitnessAgent] Sending question to AnythingLLM: "${question}"`);
    console.log(`[WitnessAgent] Session ID: ${this.sessionId}`);

    // Prepend system prompt to establish witness role
    const systemPrompt = this.getSystemPrompt();
    const fullMessage = `${systemPrompt}\n\n---\n\nFrage: ${question}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: fullMessage,
        mode: 'chat',
        sessionId: this.sessionId,
        // Reset chat history on first question of new session
        reset: this.isFirstQuestion,
      }),
    });

    // After first question, don't reset anymore
    this.isFirstQuestion = false;

    console.log(`[WitnessAgent] Response status: ${response.status}`);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized: Invalid API key (401)');
      }
      throw new Error(`AnythingLLM request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`[WitnessAgent] Full response:`, JSON.stringify(data, null, 2));

    // AnythingLLM returns { textResponse: "..." }
    if (!data.textResponse) {
      throw new Error('Invalid response from AnythingLLM: missing textResponse');
    }

    console.log(`[WitnessAgent] Extracted answer: "${data.textResponse}"`);

    return data.textResponse;
  }

  /**
   * Ask a question to the witness (LangChain RAG)
   */
private async askLangChain(question: string): Promise<string> {
  if (!this.documentLoader || !this.textSplitter || !this.embeddingService || !this.vectorStoreManager) {
    throw new Error('LangChain services not initialized');
  }

  console.log(`[WitnessAgent] Processing question with LangChain RAG: "${question}"`);

  try {
    // Process document if not already done
    if (!this.documentProcessed) {
      await this.processDocumentForLangChain();
    }

    // Retrieve relevant chunks
    const relevantDocs = await this.vectorStoreManager.search(question, { k: 5 });
    console.log(`[WitnessAgent] Retrieved ${relevantDocs.length} relevant chunks`);

    // Build context from chunks
    const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');

    // Build bilingual prompt text
    const contextLabel = this.language === 'de'
      ? 'Basierend auf diesem Kontext aus dem Dokument:'
      : 'Based on this context from the document:';
    const answerLabel = this.language === 'de'
      ? 'Antwort als Zeuge:'
      : 'Answer as witness:';

    // Build prompt with system role + context + question
    const systemPrompt = this.getSystemPrompt();
    const prompt = `${systemPrompt}

${contextLabel}

${context}

Frage: ${question}

${answerLabel}`;

    // Query LLM via Ollama directly
    const ollamaResponse = await fetch(
      `${this.embeddingService.getConfig().baseUrl}/api/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:7b',
          prompt,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 1000,
          },
        }),
      }
    );

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API request failed: ${ollamaResponse.status}`);
    }

    const ollamaData = await ollamaResponse.json();
    const response = ollamaData.response;

    console.log(`[WitnessAgent] Generated response: "${response.substring(0, 100)}..."`);

    return response;
  } catch (error) {
    console.error(`[WitnessAgent] LangChain query failed:`, error);
    throw new Error(
      `LangChain query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

  /**
   * Process document for LangChain RAG (load, split, embed, store)
   */
  private async processDocumentForLangChain(): Promise<void> {
    if (!this.documentLoader || !this.textSplitter || !this.embeddingService || !this.vectorStoreManager) {
      throw new Error('LangChain services not initialized');
    }

    if (!this.langchainConfig?.documentPath) {
      throw new Error('Document path not configured for LangChain mode');
    }

    console.log(`[WitnessAgent] Processing document: ${this.langchainConfig.documentPath}`);

    try {
      // 1. Load document
      const documents = await this.documentLoader.loadDocument(this.langchainConfig.documentPath);
      console.log(`[WitnessAgent] Loaded ${documents.length} documents`);

      // 2. Split into chunks
      const chunks = await this.textSplitter.splitDocuments(documents);
      console.log(`[WitnessAgent] Split into ${chunks.length} chunks`);

      // 3. Store in vector database (embeddings are handled automatically)
      await this.vectorStoreManager.initialize();
      await this.vectorStoreManager.addDocuments(chunks);
      console.log(`[WitnessAgent] Documents stored in vector database`);

      this.documentProcessed = true;
      console.log(`[WitnessAgent] Document processing complete`);
    } catch (error) {
      console.error(`[WitnessAgent] Document processing failed:`, error);
      throw new Error(`Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
