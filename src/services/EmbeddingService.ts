/**
 * Embedding Service
 * Generates vector embeddings using Ollama
 * Supports batch processing for performance
 */

import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';

export interface EmbeddingServiceConfig {
  model: string;           // Default: "nomic-embed-text"
  baseUrl: string;         // Default: "http://localhost:11434"
  batchSize: number;       // Default: 10
}

export class EmbeddingService {
  private embeddings: OllamaEmbeddings;
  private config: EmbeddingServiceConfig;

  constructor(config: Partial<EmbeddingServiceConfig> = {}) {
    this.config = {
      model: config.model || 'nomic-embed-text',
      baseUrl: config.baseUrl || 'http://localhost:11434',
      batchSize: Math.max(1, (config.batchSize ?? 10)),
    };

    this.embeddings = new OllamaEmbeddings({
      model: this.config.model,
      baseUrl: this.config.baseUrl,
    });
  }

  /**
   * Embed multiple documents with batch processing
   * Processes in batches to avoid overwhelming Ollama
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    const batchSize = Math.max(1, this.config.batchSize);

    console.log(`[EmbeddingService] Embedding ${texts.length} texts in batches of ${batchSize}`);

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(texts.length / batchSize);

      console.log(`[EmbeddingService] Processing batch ${batchNumber}/${totalBatches} (${batch.length} texts)`);

      try {
        const embeddings = await this.embeddings.embedDocuments(batch);
        results.push(...embeddings);
        
        console.log(`[EmbeddingService] Batch ${batchNumber}/${totalBatches} completed`);
      } catch (error) {
        console.error(`[EmbeddingService] Batch ${batchNumber} failed:`, error);
        throw new Error(`Failed to embed batch ${batchNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`[EmbeddingService] All ${texts.length} texts embedded successfully`);
    return results;
  }

  /**
   * Embed a single query text
   * Used for similarity search queries
   */
  async embedQuery(text: string): Promise<number[]> {
    console.log(`[EmbeddingService] Embedding query (length: ${text.length})`);

    try {
      const embedding = await this.embeddings.embedQuery(text);
      console.log(`[EmbeddingService] Query embedded successfully (dimension: ${embedding.length})`);
      return embedding;
    } catch (error) {
      console.error(`[EmbeddingService] Query embedding failed:`, error);
      throw new Error(`Failed to embed query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test connection to Ollama
   * Embeds a simple test string to verify service is available
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(`[EmbeddingService] Testing connection to Ollama at ${this.config.baseUrl}`);
      await this.embeddings.embedQuery('test');
      console.log(`[EmbeddingService] Connection test successful`);
      return true;
    } catch (error) {
      console.error(`[EmbeddingService] Connection test failed:`, error);
      return false;
    }
  }

  /**
   * Get embedding dimension for the current model
   * nomic-embed-text: 768 dimensions
   */
  async getEmbeddingDimension(): Promise<number> {
    const testEmbedding = await this.embedQuery('test');
    return testEmbedding.length;
  }

  /**
   * Get current configuration
   */
  getConfig(): EmbeddingServiceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (creates new embeddings instance)
   */
  updateConfig(config: Partial<EmbeddingServiceConfig>): void {
    const nextBatch =
      config.batchSize !== undefined ? Math.max(1, config.batchSize) : this.config.batchSize;
    this.config = { ...this.config, ...config, batchSize: nextBatch };

    // Recreate embeddings instance with new config
    this.embeddings = new OllamaEmbeddings({
      model: this.config.model,
      baseUrl: this.config.baseUrl,
    });

    console.log(`[EmbeddingService] Configuration updated:`, this.config);
  }
}