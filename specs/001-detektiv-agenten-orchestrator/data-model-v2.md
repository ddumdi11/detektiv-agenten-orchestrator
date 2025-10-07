
# Data Model v2 - RAG Integration

**Task**: T053 - Update data model for RAG integration
**Date**: 2025-10-07
**Branch**: 007-langchain-rag-integration
**Prerequisites**: [rag-architecture.md](./rag-architecture.md)

## Overview

This document extends the original [data-model.md](./data-model.md) with new entities for LangChain RAG integration. The original entities remain unchanged for backward compatibility.

---

## New Entities

### DocumentSource

Represents an uploaded document for RAG pipeline.

```typescript
export interface DocumentSource {
  // Identity
  id: string;                    // UUID
  workspaceId: string;           // Links to witness workspace
  
  // File Information
  filePath: string;              // Original file path
  filename: string;              // Display name
  fileType: 'pdf' | 'txt' | 'docx' | 'html';
  fileSizeBytes: number;
  
  // Processing Status
  uploadTimestamp: string;       // ISO 8601
  embeddingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  embeddingProgress: number;     // 0-100 percentage
  embeddingError?: string;       // Error message if failed
  
  // Chunking Results
  chunkCount: number;            // Total chunks created
  totalTokens: number;           // Approximate token count
  
  // Vector Store Reference
  vectorStoreCollectionId: string;  // ChromaDB collection ID
  
  // Metadata
  extractedMetadata?: {
    title?: string;
    author?: string;
    pageCount?: number;          // For PDFs
    sections?: string[];         // For structured documents
  };
}
```

**Validation Rules**:
- `id`: Must be valid UUID
- `filePath`: Must exist and be readable
- `fileType`: Must be one of: pdf, txt, docx, html
- `fileSizeBytes`: Must be > 0 and < 52428800 (50MB)
- `embeddingStatus`: Must transition: pending → processing → (completed | failed)
- `embeddingProgress`: Must be 0-100
- `chunkCount`: Must be > 0 after processing
- `vectorStoreCollectionId`: Must match ChromaDB collection naming rules

**Relationships**:
- Belongs to one Workspace (via workspaceId)
- Referenced by WitnessAgent for retrieval
- Stored in ChromaDB as vector embeddings

---

### RAGConfiguration

Settings for LangChain RAG pipeline.

```typescript
export interface RAGConfiguration {
  // Chunking Strategy
  chunkSize: number;             // Default: 1000 tokens
  chunkOverlap: number;          // Default: 200 tokens
  
  // Embedding Configuration
  embeddingModel: string;        // Default: "nomic-embed-text"
  embeddingBaseUrl: string;      // Default: "http://localhost:11434"
  embeddingDimension: number;    // Default: 768 (nomic-embed-text)
  
  // Vector Store Configuration
  vectorStoreType: 'chromadb' | 'milvus' | 'lancedb';
  vectorStoreUrl: string;        // Default: "http://localhost:8000"
  vectorStoreCollectionPrefix: string;  // Default: "witness-docs"
  
  // Retrieval Parameters
  topK: number;                  // Default: 5 (range: 3-10)
  similarityThreshold: number;   // Default: 0.7 (range: 0.5-0.9)
  retrievalStrategy: 'similarity' | 'mmr';  // Default: similarity
  mmrLambda?: number;            // Default: 0.5 (only for MMR)
  mmrFetchK?: number;            // Default: 20 (only for MMR)
  
  // LLM Configuration
  llmModel: string;              // Default: "qwen2.5:7b"
  llmBaseUrl: string;            // Default: "http://localhost:11434"
  llmTemperature: number;        // Default: 0.1
  llmMaxTokens?: number;         // Optional max response length
  
  // Performance Tuning
  batchSize: number;             // Default: 10 (for embedding batches)
  cacheEnabled: boolean;         // Default: true
  cacheMaxSize: number;          // Default: 100 (LRU cache)
}
```

**Validation Rules**:
- `chunkSize`: Must be 100-5000
- `chunkOverlap`: Must be 0 to chunkSize-1
- `embeddingModel`: Must be valid Ollama model name
- `embeddingBaseUrl`: Must be valid URL
- `vectorStoreType`: Must be one of: chromadb, milvus, lancedb
- `vectorStoreUrl`: Must be valid URL
- `topK`: Must be 1-20
- `similarityThreshold`: Must be 0.0-1.0
- `retrievalStrategy`: Must be one of: similarity, mmr
- `llmTemperature`: Must be 0.0-2.0
- `batchSize`: Must be 1-50

**Default Configuration**:
```typescript
export const DEFAULT_RAG_CONFIG: RAGConfiguration = {
  chunkSize: 1000,
  chunkOverlap: 200,
  embeddingModel: "nomic-embed-text",
  embeddingBaseUrl: "http://localhost:11434",
  embeddingDimension: 768,
  vectorStoreType: "chromadb",
  vectorStoreUrl: "http://localhost:8000",
  vectorStoreCollectionPrefix: "witness-docs",
  topK: 5,
  similarityThreshold: 0.7,
  retrievalStrategy: "similarity",
  llmModel: "qwen2.5:7b",
  llmBaseUrl: "http://localhost:11434",
  llmTemperature: 0.1,
  batchSize: 10,
  cacheEnabled: true,
  cacheMaxSize: 100,
};
```

---

## Updated Entities

### Configuration (Extended)

Original Configuration entity extended with RAG settings.

```typescript
export interface Configuration {
  // Existing fields (unchanged)
  detectives: Array<{
    provider: 'openai' | 'anthropic' | 'gemini';
    apiKey: string;
    model: string;
    isDefault: boolean;
  }>;
  
  witness: {
    mode: 'anythingllm' | 'langchain';  // NEW: Mode selector
    
    // AnythingLLM settings (existing)
    apiKey?: string;
    baseUrl?: string;
    workspaceSlug?: string;
    
    // LangChain settings (NEW)
    ragConfig?: RAGConfiguration;
  };
  
  providerFallbackOrder: string[];
  
  timeouts: {
    cloudTimeout: number;
    localTimeout: number;
  };
  
  defaultIterationLimit: number;
}
```

**Migration Notes**:
- Existing configurations remain valid
- `witness.mode` defaults to 'anythingllm' for backward compatibility
- `witness.ragConfig` is optional, only used when mode='langchain'

---

### WitnessAgent Interface (Extended)

```typescript
export interface WitnessAgentConfig {
  mode: 'anythingllm' | 'langchain';
  language: 'de' | 'en';
  
  // AnythingLLM config (existing)
  apiKey?: string;
  baseUrl?: string;
  workspaceSlug?: string;
  
  // LangChain config (NEW)
  ragConfig?: RAGConfiguration;
  documents?: DocumentSource[];  // Pre-loaded documents
}
```

---

## New Service Interfaces

### DocumentManagementService

Manages document lifecycle for RAG.

```typescript
export interface DocumentManagementService {
  // Upload & Processing
  uploadDocument(file: File): Promise<DocumentSource>;
  processDocument(docId: string): Promise<void>;  // Embed + store
  
  // CRUD
  listDocuments(workspaceId: string): Promise<DocumentSource[]>;
  getDocument(docId: string): Promise<DocumentSource>;
  deleteDocument(docId: string): Promise<void>;
  
  // Status
  getEmbeddingProgress(docId: string): Promise<number>;
  
  // Bulk Operations
  deleteAllDocuments(workspaceId: string): Promise<void>;
  reprocessAllDocuments(workspaceId: string): Promise<void>;
}
```

---

## Data Flow Diagrams

### Document Upload Flow

```
User selects file
    ↓
[UI] InterrogationForm validates file
    ↓
[IPC] electronAPI.documents.upload(file)
    ↓
[Main] DocumentManagementService.uploadDocument()
    ↓
[Service] Create DocumentSource entity (status: pending)
    ↓
[Service] Save to JSON (documents/{workspaceId}/{docId}.json)
    ↓
[Service] Trigger background processing
    ↓
[Background] DocumentLoader.loadDocument()
    ↓
[Background] TextSplitter.splitDocuments()
    ↓
[Background] EmbeddingService.embedDocuments() (batch)
    ↓
[Background] VectorStoreManager.addDocuments()
    ↓
[Background] Update DocumentSource (status: completed)
    ↓
[IPC] Send progress events to UI
    ↓
[UI] Display embedding progress
```

### Query Flow with LangChain

```
Detective asks question
    ↓
[Agent] WitnessAgent.ask(question)
    ↓
[Agent] Check mode: langchain
    ↓
[Service] EmbeddingService.embedQuery(question)
    ↓
[Service] VectorStoreManager.search(queryVector, topK=5)
    ↓
[Service] Retrieve top-5 relevant chunks
    ↓
[Agent] Build prompt with system role + context + question
    ↓
[Service] ChatOllama.invoke(prompt)
    ↓
[Agent] Return answer to Detective
```

---

## Storage Structure

### File System Layout

```
~/.detektiv-agenten/
├── config.json                 # Encrypted configuration
├── sessions/                   # Interrogation sessions
│   └── {sessionId}.json
├── documents/                  # NEW: Document metadata
│   └── {workspaceId}/
│       ├── {docId1}.json      # DocumentSource metadata
│       ├── {docId2}.json
│       └── ...
└── chromadb/                   # NEW: Vector store data
    └── {collectionName}/
        ├── chroma.sqlite3     # ChromaDB persistence
        └── ...
```

### DocumentSource JSON Example

```json
{
  "id": "doc-123e4567-e89b-12d3-a456-426614174000",
  "workspaceId": "mynearlydryottobretrial",
  "filePath": "/path/to/Alkohol ade.pdf",
  "filename": "Alkohol ade.pdf",
  "fileType": "pdf",
  "fileSizeBytes": 2458624,
  "uploadTimestamp": "2025-10-07T12:00:00.000Z",
  "embeddingStatus": "completed",
  "embeddingProgress": 100,
  "chunkCount": 127,
  "totalTokens": 50900,
  "vectorStoreCollectionId": "witness-docs-mynearlydryottobretrial",
  "extractedMetadata": {
    "title": "Alkohol ade: Der direkte Weg zurück",
    "author": "Gaby Guzek",
    "pageCount": 245
  }
}
```

---

## Migration Considerations

### Backward Compatibility

**Existing Sessions** (AnythingLLM):
- Remain loadable (read-only)
- Display with "AnythingLLM" badge
- Cannot be re-run with LangChain mode

**Configuration Migration**:
```typescript
// Auto-migrate old config to new structure
function migrateConfig(oldConfig: any): Configuration {
  return {
    ...oldConfig,
    witness: {
      mode: 'anythingllm',  // Default to existing mode
      apiKey: oldConfig.witness.apiKey,
      baseUrl: oldConfig.witness.baseUrl,
      workspaceSlug: oldConfig.witness.workspaceSlug,
      // ragConfig: undefined (not set for old configs)
    },
  };
}
```

### Data Cleanup

**When switching from AnythingLLM to LangChain**:
- Prompt user: "Upload documents to use LangChain mode"
- Keep AnythingLLM config for fallback
- Don't delete old sessions

**When deleting workspace**:
- Delete all DocumentSource files
- Delete ChromaDB collection
- Keep sessions for audit trail

---

## Validation Functions

### DocumentSource Validation

```typescript
export function validateDocumentSource(doc: DocumentSource): string[] {
  const errors: string[] = [];
  
  if (!doc.id || !isValidUUID(doc.id)) {
    errors.push("Invalid document ID");
  }
  
  if (!doc.filename || doc.filename.trim() === '') {
    errors.push("Filename is required");
  }
  
  if (!['pdf', 'txt', 'docx', 'html'].includes(doc.fileType)) {
    errors.push("Invalid file type");
  }
  
  if (doc.fileSizeBytes <= 0 || doc.fileSizeBytes > 52428800) {
    errors.push("File size must be between 1 byte and 50MB");
  }
  
  if (!['pending', 'processing', 'completed', 'failed'].includes(doc.embeddingStatus)) {
    errors.push("Invalid embedding status");
  }
  
  if (doc.embeddingProgress < 0 || doc.embeddingProgress > 100) {
    errors.push("Embedding progress must be 0-100");
  }
  
  return errors;
}
```

### RAGConfiguration Validation

```typescript
export function validateRAGConfig(config: RAGConfiguration): string[] {
  const errors: string[] = [];

  if (config.chunkSize < 100 || config.chunkSize > 5000) {
    errors.push("Chunk size must be 100-5000 characters");
  }

  if (config.chunkOverlap < 0 || config.chunkOverlap >= config.chunkSize) {
    errors.push("Chunk overlap must be 0 to chunkSize-1");
  }

  if (!isValidUrl(config.embeddingBaseUrl)) {
    errors.push("Invalid embedding base URL");
  }

  if (!isValidUrl(config.vectorStoreUrl)) {
    errors.push("Invalid vector store URL");
  }

  if (!['chromadb', 'milvus', 'lancedb'].includes(config.vectorStoreType)) {
    errors.push("Invalid vector store type");
  }

  if (config.topK < 1 || config.topK > 20) {
    errors.push("topK must be 1-20");
  }

  if (config.similarityThreshold < 0.0 || config.similarityThreshold > 1.0) {
    errors.push("Similarity threshold must be 0.0-1.0");
  }

  if (!['similarity', 'mmr'].includes(config.retrievalStrategy)) {
    errors.push("Invalid retrieval strategy");
  }

  if (config.retrievalStrategy === 'mmr') {
    if (config.mmrLambda !== undefined && (config.mmrLambda < 0.0 || config.mmrLambda > 1.0)) {
      errors.push("MMR lambda must be 0.0-1.0");
    }
    if (config.mmrFetchK !== undefined && config.mmrFetchK < config.topK) {
      errors.push("MMR fetchK must be >= topK");
    }
  }

  if (config.llmTemperature < 0.0 || config.llmTemperature > 2.0) {
    errors.push("LLM temperature must be 0.0-2.0");
  }

  if (config.llmMaxTokens !== undefined && config.llmMaxTokens <= 0) {
    errors.push("LLM max tokens must be > 0");
  }

  if (config.batchSize < 1 || config.batchSize > 50) {
    errors.push("Batch size must be 1-50");
  }

  if (config.embeddingDimension <= 0) {
    errors.push("Embedding dimension must be > 0");
  }

  return errors;
}
```