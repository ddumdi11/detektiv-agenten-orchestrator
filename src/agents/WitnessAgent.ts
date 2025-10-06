/**
 * Witness Agent - Integrates with AnythingLLM to answer questions
 * Uses RAG (Retrieval-Augmented Generation) via workspace embeddings
 */

interface WitnessAgentConfig {
  apiKey: string;
  baseUrl: string;
  workspaceSlug: string;
}

export class WitnessAgent {
  private apiKey: string;
  private baseUrl: string;
  private workspaceSlug: string;

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
  }

  /**
   * Ask a question to the witness (AnythingLLM workspace)
   */
  async ask(question: string): Promise<string> {
    const url = `${this.baseUrl}/api/v1/workspace/${this.workspaceSlug}/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: question,
        mode: 'chat',
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized: Invalid API key (401)');
      }
      throw new Error(`AnythingLLM request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // AnythingLLM returns { textResponse: "..." }
    if (!data.textResponse) {
      throw new Error('Invalid response from AnythingLLM: missing textResponse');
    }

    return data.textResponse;
  }
}
