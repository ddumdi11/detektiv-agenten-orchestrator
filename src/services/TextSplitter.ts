/**
 * Text Splitter Service
 * Splits documents into chunks for embedding and retrieval
 * Uses RecursiveCharacterTextSplitter for natural boundary preservation
 */

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';

export interface TextSplitterConfig {
  chunkSize: number;      // Default: 1000 characters
  chunkOverlap: number;   // Default: 200 characters
}

export class TextSplitter {
  private splitter: RecursiveCharacterTextSplitter;
  private config: TextSplitterConfig;

  constructor(config: TextSplitterConfig = { chunkSize: 1000, chunkOverlap: 200 }) {
    this.config = config;
    
    // Create splitter with natural separators
    // Tries to split on paragraphs first, then sentences, then words
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
      separators: [
        '\n\n',   // Paragraphs (double newline)
        '\n',     // Single newline
        '. ',     // Sentences
        '! ',     // Exclamations
        '? ',     // Questions
        '; ',     // Semicolons
        ', ',     // Commas
        ' ',      // Words
        '',       // Characters (fallback)
      ],
    });
  }

  /**
   * Split documents into chunks
   */
  async splitDocuments(docs: Document[]): Promise<Document[]> {
    const chunks = await this.splitter.splitDocuments(docs);
    
    // Add chunk metadata
    return chunks.map((chunk, index) => {
      return new Document({
        pageContent: chunk.pageContent,
        metadata: {
          ...chunk.metadata,
          chunkIndex: index,
          totalChunks: chunks.length,
          chunkSize: chunk.pageContent.length,
        },
      });
    });
  }

  /**
   * Get estimated chunk count for documents
   * Useful for progress estimation before actual splitting
   */
  getEstimatedChunkCount(docs: Document[]): number {
    const totalLength = docs.reduce((sum, doc) => sum + doc.pageContent.length, 0);

    // Guard against invalid chunk sizes
    if (this.config.chunkSize <= 0) {
      return 1; // Single chunk for invalid size
    }

    // Calculate effective chunk size (considering overlap)
    const effectiveChunkSize = this.config.chunkSize - this.config.chunkOverlap;

    // Guard against overlap >= chunkSize (would cause infinite chunks)
    if (effectiveChunkSize <= 0) {
      return 1; // Single chunk when overlap is too large
    }

    // Estimate chunks: (total - initial overlap) / effective size, rounded up
    // Ensure at least 1 chunk is returned
    return Math.max(1, Math.ceil((totalLength - this.config.chunkOverlap) / effectiveChunkSize));
  }

  /**
   * Get current configuration
   */
  getConfig(): TextSplitterConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (creates new splitter instance)
   */
  updateConfig(config: Partial<TextSplitterConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Recreate splitter with new config
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
      separators: ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ', ''],
    });
  }
}