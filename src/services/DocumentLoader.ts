/**
 * Document Loader Service
 * Loads and extracts text from various document formats
 * Supports: TXT, HTML, PDF, DOCX
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Document } from '@langchain/core/documents';

export type SupportedFileType = 'txt' | 'html' | 'pdf' | 'docx';

export interface DocumentMetadata {
  source: string;
  filename: string;
  fileType: SupportedFileType;
  fileSizeBytes: number;
  encoding?: string;
}

export class DocumentLoader {
  /**
   * Get list of supported file extensions
   */
  getSupportedFormats(): string[] {
    return ['.txt', '.html', '.htm', '.pdf', '.docx'];
  }

  /**
   * Load document from file path
   */
  async loadDocument(filePath: string): Promise<Document[]> {
    // Validate file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file stats
    const stats = await fs.stat(filePath);
    const fileSizeBytes = stats.size;

    // Validate file size (max 50MB)
    if (fileSizeBytes > 52428800) {
      throw new Error(`File too large: ${fileSizeBytes} bytes (max 50MB)`);
    }

    // Determine file type
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);

    switch (ext) {
      case '.txt':
        return this.loadTextFile(filePath, filename, fileSizeBytes);

      case '.html':
      case '.htm':
        return this.loadHTMLFile(filePath, filename, fileSizeBytes);

      case '.pdf':
        return this.loadPDFFile(filePath, filename, fileSizeBytes);

      case '.docx':
        return this.loadDOCXFile(filePath, filename, fileSizeBytes);

      default:
        throw new Error(`Unsupported file type: ${ext}. Supported: ${this.getSupportedFormats().join(', ')}`);
    }
  }

  /**
   * Load plain text file
   */
  private async loadTextFile(
    filePath: string,
    filename: string,
    fileSizeBytes: number
  ): Promise<Document[]> {
    // Try UTF-8 first, fallback to Latin-1
    let content: string;
    let encoding: string;

    try {
      content = await fs.readFile(filePath, 'utf-8');
      encoding = 'utf-8';
    } catch (error) {
      // Fallback to Latin-1 (ISO-8859-1)
      const buffer = await fs.readFile(filePath);
      content = buffer.toString('latin1');
      encoding = 'latin1';
    }

    // Create metadata
    const metadata: DocumentMetadata = {
      source: filePath,
      filename,
      fileType: 'txt',
      fileSizeBytes,
      encoding,
    };

    // Return as single document
    return [
      new Document({
        pageContent: content,
        metadata,
      }),
    ];
  }

  /**
   * Load HTML file and extract text content
   */
  private async loadHTMLFile(
    filePath: string,
    filename: string,
    fileSizeBytes: number
  ): Promise<Document[]> {
    // Read HTML file
    const htmlContent = await fs.readFile(filePath, 'utf-8');

    // Simple HTML text extraction (remove tags)
    // For more sophisticated extraction, could use cheerio or jsdom
    const textContent = this.extractTextFromHTML(htmlContent);

    // Create metadata
    const metadata: DocumentMetadata = {
      source: filePath,
      filename,
      fileType: 'html',
      fileSizeBytes,
      encoding: 'utf-8',
    };

    // Return as single document
    return [
      new Document({
        pageContent: textContent,
        metadata,
      }),
    ];
  }

  /**
   * Load PDF file and extract text content
   */
  private async loadPDFFile(
    filePath: string,
    filename: string,
    fileSizeBytes: number
  ): Promise<Document[]> {
    // Read PDF file as buffer
    const buffer = await fs.readFile(filePath);

    // Use require for CommonJS module pdf-parse
    const pdfParse = require('pdf-parse');

    // Parse PDF and extract text
    const pdfData = await pdfParse(buffer);
    const textContent = pdfData.text;

    // Create metadata
    const metadata: DocumentMetadata = {
      source: filePath,
      filename,
      fileType: 'pdf',
      fileSizeBytes,
      encoding: 'utf-8',
    };

    // Return as single document
    return [
      new Document({
        pageContent: textContent,
        metadata,
      }),
    ];
  }

  /**
   * Load DOCX file and extract text content
   */
  private async loadDOCXFile(
    filePath: string,
    filename: string,
    fileSizeBytes: number
  ): Promise<Document[]> {
    // Read DOCX file as buffer
    const buffer = await fs.readFile(filePath);

    // Extract text from DOCX using mammoth
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    const textContent = result.value;

    // Create metadata
    const metadata: DocumentMetadata = {
      source: filePath,
      filename,
      fileType: 'docx',
      fileSizeBytes,
      encoding: 'utf-8',
    };

    // Return as single document
    return [
      new Document({
        pageContent: textContent,
        metadata,
      }),
    ];
  }

  /**
   * Extract text from HTML (simple tag removal)
   * For production, consider using cheerio or jsdom for better extraction
   */
  private extractTextFromHTML(html: string): string {
    // Remove script and style tags with their content
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  /**
   * Validate file before loading
   */
  async validateFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check file exists
      await fs.access(filePath);
      
      // Check file size
      const stats = await fs.stat(filePath);
      if (stats.size > 52428800) {
        return { valid: false, error: 'File too large (max 50MB)' };
      }
      
      // Check file type
      const ext = path.extname(filePath).toLowerCase();
      if (!this.getSupportedFormats().includes(ext)) {
        return { 
          valid: false, 
          error: `Unsupported file type: ${ext}. Supported: ${this.getSupportedFormats().join(', ')}` 
        };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: `File not accessible: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
}