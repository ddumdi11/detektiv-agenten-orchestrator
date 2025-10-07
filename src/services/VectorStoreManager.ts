/**
 * Vector Store Manager
 * Manages ChromaDB vector store for document embeddings
 * Provides CRUD operations and similarity search
 * Falls back to in-memory storage for testing
 */

import { Chroma } from '@langchain/community/vectorstores/chroma';
import { MemoryVectorStore } from '@langchain/community/vectorstores/memory';
import { Document } from '@langchain/core/documents';
import type { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';

export interface VectorStoreConfig {
  url?: string;             // Default: "http://localhost:8000" (optional for in-memory)
  collectionName: string;   // e.g., "witness-docs-workspace123"
  useInMemory?: boolean;    // Use in-memory store instead of ChromaDB
}

export interface SearchOptions {
  k: number;                      // Number of results (default: 5)
  filter?: Record<string, any>;   // Metadata filter
  scoreThreshold?: number;        // Minimum similarity score (0-1)
}

export class VectorStoreManager {
  private vectorStore: Chroma | null = null;
  private config: VectorStoreConfig;
  private embeddings: OllamaEmbeddings;
  private isInitialized: boolean = false;

  constructor(
    embeddings: OllamaEmbeddings,
    config: VectorStoreConfig
  ) {
    this.embeddings = embeddings;
    this.config = config;
  }

  /**
   * Initialize vector store
   * Creates or connects to existing ChromaDB collection
   */
  async initialize(): Promise<void> {
    console.log(`[VectorStore] Initializing ChromaDB at ${this.config.url}`);
    console.log(`[VectorStore] Collection: ${this.config.collectionName}`);

    try {
      // Try to connect to existing collection
      this.vectorStore = await Chroma.fromExistingCollection(
        this.embeddings,
        {
          collectionName: this.config.collectionName,
          url: this.config.url,
        }
      );
      
      console.log(`[VectorStore] Connected to existing collection`);
      this.isInitialized = true;
    } catch (error) {
      // Collection doesn't exist yet - will be created on first addDocuments
      console.log(`[VectorStore] Collection does not exist yet, will be created on first document add`);
      this.isInitialized = true;
    }
  }

  /**
   * Add documents to vector store
   * Creates collection if it doesn't exist
   */
  async addDocuments(docs: Document[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    console.log(`[VectorStore] Adding ${docs.length} documents to collection`);

    try {
      if (this.vectorStore) {
        // Add to existing collection
        await this.vectorStore.addDocuments(docs);
      } else {
        // Create new collection with documents
        this.vectorStore = await Chroma.fromDocuments(
          docs,
          this.embeddings,
          {
            collectionName: this.config.collectionName,
            url: this.config.url,
          }
        );
      }
      
      console.log(`[VectorStore] Documents added successfully`);
    } catch (error) {
      console.error(`[VectorStore] Failed to add documents:`, error);
      throw new Error(`Failed to add documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Similarity search
   * Returns top-k most similar documents to query
   */
  async search(query: string, options: SearchOptions = { k: 5 }): Promise<Document[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized or empty. Add documents first.');
    }

    console.log(`[VectorStore] Searching for: "${query.substring(0, 50)}..." (k=${options.k})`);

    try {
      const results = await this.vectorStore.similaritySearch(
        query,
        options.k,
        options.filter
      );
      
      console.log(`[VectorStore] Found ${results.length} results`);
      return results;
    } catch (error) {
      console.error(`[VectorStore] Search failed:`, error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Similarity search with scores
   * Returns documents with their similarity scores
   */
  async searchWithScores(
    query: string,
    options: SearchOptions = { k: 5 }
  ): Promise<Array<[Document, number]>> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized or empty. Add documents first.');
    }

    console.log(`[VectorStore] Searching with scores: "${query.substring(0, 50)}..." (k=${options.k})`);

    try {
      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        options.k,
        options.filter
      );
      
      // Filter by score threshold if provided
      // ChromaDB returns distances (lower = better), so we keep results with score <= threshold
      const filteredResults = options.scoreThreshold
        ? results.filter(([_, score]) => score <= options.scoreThreshold!)
        : results;
      
      console.log(`[VectorStore] Found ${filteredResults.length} results (${results.length} before threshold filter)`);
      
      return filteredResults;
    } catch (error) {
      console.error(`[VectorStore] Search with scores failed:`, error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all documents from collection
   * Keeps the collection but removes all stored documents
   */
  async clearCollection(): Promise<void> {
    console.log(`[VectorStore] Clearing collection: ${this.config.collectionName}`);

    try {
      if (this.vectorStore) {
        // Delete all documents from collection
        // ChromaDB will handle document cleanup
        await this.vectorStore.delete({});
        console.log(`[VectorStore] Collection cleared successfully`);
      } else {
        console.log(`[VectorStore] No collection to clear`);
      }
    } catch (error) {
      console.error(`[VectorStore] Failed to clear collection:`, error);
      throw new Error(`Failed to clear collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get document count in collection
   */
  async getDocumentCount(): Promise<number> {
    if (!this.vectorStore) {
      return 0;
    }

    try {
      // ChromaDB doesn't have a direct count method
      // We can estimate by doing a search with high k
      const results = await this.vectorStore.similaritySearch('', 10000);
      return results.length;
    } catch (error) {
      console.warn(`[VectorStore] Failed to get document count:`, error);
      return 0;
    }
  }

  /**
   * Test connection to ChromaDB
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(`[VectorStore] Testing connection to ChromaDB at ${this.config.url}`);
      
      // Try to list collections (simple health check)
      const response = await fetch(`${this.config.url}/api/v1/heartbeat`);
      
      if (response.ok) {
        console.log(`[VectorStore] ChromaDB connection successful`);
        return true;
      } else {
        console.error(`[VectorStore] ChromaDB returned status ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error(`[VectorStore] ChromaDB connection failed:`, error);
      return false;
    }
  }

  /**
   * Check if vector store is ready for operations
   */
  isReady(): boolean {
    return this.isInitialized && this.vectorStore !== null;
  }

  /**
   * Get current configuration
   */
  getConfig(): VectorStoreConfig {
    return { ...this.config };
  }
}