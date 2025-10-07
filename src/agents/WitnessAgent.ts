/**
 * Witness Agent - Integrates with AnythingLLM to answer questions
 * Uses RAG (Retrieval-Augmented Generation) via workspace embeddings
 */

interface WitnessAgentConfig {
  apiKey: string;
  baseUrl: string;
  workspaceSlug: string;
  language?: 'de' | 'en';
}

export class WitnessAgent {
  private apiKey: string;
  private baseUrl: string;
  private workspaceSlug: string;
  private language: 'de' | 'en';
  private sessionId: string;
  private isFirstQuestion: boolean = true;

  constructor(config: WitnessAgentConfig) {
    // Validate configuration
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('apiKey is required');
    }
    if (!config.workspaceSlug || config.workspaceSlug.trim() === '') {
      throw new Error('workspaceSlug is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'http://localhost:3001';
    this.workspaceSlug = config.workspaceSlug;
    this.language = config.language || 'en';
    // Generate unique session ID for this witness instance
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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
   * Generates a new session ID to start fresh
   */
  async resetChat(): Promise<void> {
    console.log(`[WitnessAgent] Resetting chat - generating new session ID`);
    // Generate new session ID for fresh start
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.isFirstQuestion = true;
    console.log(`[WitnessAgent] New session ID: ${this.sessionId}`);
  }

  /**
   * Ask a question to the witness (AnythingLLM workspace)
   */
  async ask(question: string): Promise<string> {
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
}
