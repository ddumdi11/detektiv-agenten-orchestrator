# RAG Pipeline Architecture Design

**Task**: T052 - Design RAG pipeline architecture
**Date**: 2025-10-07
**Branch**: 007-langchain-rag-integration
**Prerequisites**: [research-langchain.md](./research-langchain.md)

## Executive Summary

This document defines the complete RAG (Retrieval-Augmented Generation) pipeline architecture for the LangChain.js integration. The pipeline replaces AnythingLLM with direct control over document processing, embedding, storage, and retrieval.

**Key Design Decisions**:
- **Document Loading**: Support PDF, TXT, DOCX with metadata extraction
- **Text Splitting**: Recursive character splitter, 1000 tokens, 200 overlap
- **Embedding**: nomic-embed-text via Ollama (local, fast, optimized for RAG)
- **Vector Store**: ChromaDB (local HTTP server, persistent)
- **Retrieval**: Similarity search with MMR (Maximal Marginal Relevance) for diversity

---

## 1. Document Loading Strategy

### Supported Formats

| Format | Loader | Metadata Extracted | Notes |
|--------|--------|-------------------|-------|
| **PDF** | `PDFLoader` | Page numbers, title, author | Uses pdf-parse library |
| **TXT** | `TextLoader` | Filename, encoding | UTF-8 and Latin-1 support |
| **DOCX** | `DocxLoader` | Title, author, sections | Uses mammoth library |

### Document Processing Flow

```
User uploads file
    ↓
1. Validate file type and size (<50MB)
    ↓
2. Extract text with appropriate loader
    ↓
3. Extract metadata (filename, type, upload timestamp)
    ↓
4. Create DocumentSource entity
    ↓
5. Pass to Text Splitter
```

### Implementation

```typescript
// src/services/DocumentLoader.ts
export class DocumentLoader {
  async loadDocument(filePath: string): Promise<Document[]> {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.pdf':
        return new PDFLoader(filePath).load();
      case '.txt':
        return new TextLoader(filePath).load();
      case '.docx':
        return new DocxLoader(filePath).load();
      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  }
}
```

---

## 2. Text Splitting Strategy

### Configuration

**Chunk Size**: 1000 tokens (optimal for 50k+ word documents)
**Chunk Overlap**: 200 tokens (preserves context across chunks)
**Splitter Type**: RecursiveCharacterTextSplitter

### Why These Values?

1. **1000 Tokens**:
   - Fits comfortably in most LLM context windows
   - Large enough to preserve paragraph-level context
   - Small enough for precise retrieval
   - Proven standard for long documents

2. **200 Token Overlap**:
   - Prevents information loss at chunk boundaries
   - 20% overlap ensures continuity
   - Helps with questions spanning multiple chunks

3. **Recursive Splitting**:
   - Tries to split on natural boundaries (paragraphs, sentences)
   - Falls back to character-level if needed
   - Preserves document structure

### Implementation

```typescript
// src/services/TextSplitter.ts
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export class TextSplitter {
  private splitter: RecursiveCharacterTextSplitter;
  
  constructor(chunkSize: number = 1000, chunkOverlap: number = 200) {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: ["\n\n", "\n", ". ", " ", ""], // Try paragraphs first
    });
  }
  
  async splitDocuments(docs: Document[]): Promise<Document[]> {
    return this.splitter.splitDocuments(docs);
  }
}
```

---

## 3. Embedding Strategy

### Model Selection: nomic-embed-text

**Specifications**:
- Model Size: ~274MB
- Embedding Dimension: 768
- Max Sequence Length: 8192 tokens
- Optimized for: Retrieval tasks (RAG)

### Embedding Process

```
Text chunks from splitter
    ↓
1. Batch chunks (10-20 at a time for performance)
    ↓
2. Send to Ollama embedding endpoint
    ↓
3. Receive 768-dimensional vectors
    ↓
4. Store vectors + metadata in ChromaDB
```

### Implementation

```typescript
// src/services/EmbeddingService.ts
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";

export class EmbeddingService {
  private embeddings: OllamaEmbeddings;
  
  constructor(baseUrl: string = "http://localhost:11434") {
    this.embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text",
      baseUrl,
    });
  }
  
  async embedDocuments(texts: string[]): Promise<number[][]> {
    // Batch processing for performance
    const batchSize = 10;
    const results: number[][] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const embeddings = await this.embeddings.embedDocuments(batch);
      results.push(...embeddings);
    }
    
    return results;
  }
}
```

### Caching Strategy

- **Cache embeddings** for uploaded documents
- **Invalidate cache** when document is re-uploaded
- **Store cache** in ChromaDB metadata
- **Benefit**: Avoid re-embedding on app restart

---

## 4. Vector Store Schema

### ChromaDB Configuration

**Collection Name**: `witness-documents-{workspaceId}`
**Distance Metric**: Cosine similarity (default, best for text)
**Persistence**: Local directory (`~/.detektiv-agenten/chromadb/`)

### Document Metadata Schema

```typescript
interface DocumentMetadata {
  source: string;           // Original file path
  filename: string;         // File name
  fileType: 'pdf' | 'txt' | 'docx';
  uploadTimestamp: string;  // ISO 8601
  chunkIndex: number;       // Position in original document
  totalChunks: number;      // Total chunks from this document
  pageNumber?: number;      // For PDFs
  section?: string;         // For structured documents
}
```

### Implementation

```typescript
// src/services/VectorStoreManager.ts
import { Chroma } from "@langchain/community/vectorstores/chroma";

export class VectorStoreManager {
  private vectorStore: Chroma | null = null;
  
  async initialize(
    embeddings: OllamaEmbeddings,
    collectionName: string
  ): Promise<void> {
    this.vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      {
        collectionName,
        url: "http://localhost:8000", // ChromaDB HTTP server
      }
    );
  }
  
  async addDocuments(docs: Document[]): Promise<void> {
    if (!this.vectorStore) throw new Error("Vector store not initialized");
    await this.vectorStore.addDocuments(docs);
  }
  
  async search(query: string, k: number = 5): Promise<Document[]> {
    if (!this.vectorStore) throw new Error("Vector store not initialized");
    return this.vectorStore.similaritySearch(query, k);
  }
  
  async deleteCollection(): Promise<void> {
    // Delete entire collection (for workspace reset)
  }
}
```

---

## 5. Retrieval Strategy

### Primary Strategy: Similarity Search

**Default Parameters**:
- **top-k**: 5 chunks (configurable 3-10)
- **Similarity Threshold**: 0.7 (configurable 0.5-0.9)
- **Distance Metric**: Cosine similarity

### Advanced Strategy: MMR (Maximal Marginal Relevance)

**Purpose**: Increase diversity in retrieved chunks
**Use Case**: When similar chunks are redundant
**Parameters**:
- **fetch_k**: 20 (fetch more candidates)
- **lambda**: 0.5 (balance relevance vs diversity)

```typescript
// MMR Retrieval Example
const retriever = vectorStore.asRetriever({
  searchType: "mmr",
  searchKwargs: {
    fetchK: 20,
    lambda: 0.5,
  },
  k: 5,
});
```

### Contextual Compression (Future Enhancement)

**Purpose**: Filter irrelevant parts of retrieved chunks
**Benefit**: Reduce noise, improve answer quality
**Implementation**: LangChain ContextualCompressionRetriever

---

## 6. Complete RAG Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Uploads Document                     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  DocumentLoader: Extract text + metadata (PDF/TXT/DOCX)     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  TextSplitter: Chunk into 1000-token pieces (200 overlap)   │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  EmbeddingService: Generate vectors (nomic-embed-text)      │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  VectorStoreManager: Store in ChromaDB with metadata        │
└─────────────────────────────────────────────────────────────┘

                    [Document Ready for Queries]

┌─────────────────────────────────────────────────────────────┐
│              Detective asks question to Witness              │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  WitnessAgent: Embed question (nomic-embed-text)            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  VectorStore: Similarity search → top-5 relevant chunks     │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Build Prompt:                                               │
│  [System] Du bist ein Zeuge. Antworte in ICH-Form...        │
│  [Context] {retrieved chunks}                                │
│  [Human] {question}                                          │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Ollama LLM (Qwen2.5:7B): Generate answer                   │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Return answer to Detective                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. System Prompt Integration

### Proper System Prompt (vs AnythingLLM Workaround)

**AnythingLLM** (current):
```typescript
// System prompt prepended to user message
const fullMessage = `${systemPrompt}\n\n---\n\nFrage: ${question}`;
// Sent as user message - model may ignore it
```

**LangChain** (new):
```typescript
// Proper system/human message structure
const prompt = ChatPromptTemplate.fromMessages([
  ["system", systemPrompt],  // Separate system role
  ["human", question],        // User question
]);
// Model respects system role properly
```

### System Prompt Template

```typescript
const WITNESS_SYSTEM_PROMPT_DE = `Du bist ein Zeuge in einem Verhör. 
Dein Wissen basiert NUR auf den folgenden Dokumenten:

{context}

WICHTIG:
- Antworte IMMER in der ICH-Form ("Ich habe gelesen...", "Im Dokument steht...")
- NIEMALS über "den Zeugen" in 3. Person sprechen
- Wenn etwas nicht in den Dokumenten steht: "Das steht nicht in den Dokumenten."
- KEIN Spekulieren über Informationen außerhalb der Dokumente
- NUR Antworten basierend auf dem bereitgestellten Kontext`;
```

---

## 8. Configuration Schema

### RAGConfiguration Interface

```typescript
export interface RAGConfiguration {
  // Chunking
  chunkSize: number;          // Default: 1000
  chunkOverlap: number;       // Default: 200
  
  // Embedding
  embeddingModel: string;     // Default: "nomic-embed-text"
  embeddingBaseUrl: string;   // Default: "http://localhost:11434"
  
  // Vector Store
  vectorStoreType: 'chromadb' | 'milvus' | 'lancedb';  // Default: chromadb
  vectorStoreUrl: string;     // Default: "http://localhost:8000"
  collectionName: string;     // Default: "witness-documents"
  
  // Retrieval
  topK: number;               // Default: 5 (range: 3-10)
  similarityThreshold: number; // Default: 0.7 (range: 0.5-0.9)
  retrievalStrategy: 'similarity' | 'mmr';  // Default: similarity
  
  // LLM
  llmModel: string;           // Default: "qwen2.5:7b"
  llmBaseUrl: string;         // Default: "http://localhost:11434"
  temperature: number;        // Default: 0.1
}
```

### Default Configuration

```typescript
export const DEFAULT_RAG_CONFIG: RAGConfiguration = {
  chunkSize: 1000,
  chunkOverlap: 200,
  embeddingModel: "nomic-embed-text",
  embeddingBaseUrl: "http://localhost:11434",
  vectorStoreType: "chromadb",
  vectorStoreUrl: "http://localhost:8000",
  collectionName: "witness-documents",
  topK: 5,
  similarityThreshold: 0.7,
  retrievalStrategy: "similarity",
  llmModel: "qwen2.5:7b",
  llmBaseUrl: "http://localhost:11434",
  temperature: 0.1,
};
```

---

## 9. Service Layer Architecture

### Service Dependencies

```
DocumentLoader (independent)
    ↓
TextSplitter (independent)
    ↓
EmbeddingService (depends on Ollama)
    ↓
VectorStoreManager (depends on ChromaDB + EmbeddingService)
    ↓
WitnessAgent (depends on VectorStoreManager + Ollama LLM)
```

### Service Interfaces

```typescript
// src/services/DocumentLoader.ts
export interface IDocumentLoader {
  loadDocument(filePath: string): Promise<Document[]>;
  getSupportedFormats(): string[];
}

// src/services/TextSplitter.ts
export interface ITextSplitter {
  splitDocuments(docs: Document[]): Promise<Document[]>;
  getChunkCount(docs: Document[]): number;
}

// src/services/EmbeddingService.ts
export interface IEmbeddingService {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

// src/services/VectorStoreManager.ts
export interface IVectorStoreManager {
  initialize(collectionName: string): Promise<void>;
  addDocuments(docs: Document[]): Promise<void>;
  search(query: string, k: number): Promise<Document[]>;
  deleteCollection(): Promise<void>;
  listDocuments(): Promise<DocumentMetadata[]>;
}
```

---

## 10. WitnessAgent Refactoring

### Dual-Mode Architecture

```typescript
// src/agents/WitnessAgent.ts
export class WitnessAgent {
  private mode: 'anythingllm' | 'langchain';
  private anythingLLMClient?: AnythingLLMClient;
  private langChainRAG?: LangChainRAG;
  
  constructor(config: WitnessAgentConfig) {
    this.mode = config.mode || 'anythingllm';
    
    if (this.mode === 'anythingllm') {
      this.anythingLLMClient = new AnythingLLMClient(config);
    } else {
      this.langChainRAG = new LangChainRAG(config.ragConfig);
    }
  }
  
  async ask(question: string): Promise<string> {
    if (this.mode === 'anythingllm') {
      return this.askAnythingLLM(question);
    } else {
      return this.askLangChain(question);
    }
  }
  
  private async askLangChain(question: string): Promise<string> {
    // 1. Retrieve relevant chunks
    const relevantDocs = await this.langChainRAG.retrieve(question);
    
    // 2. Build context from chunks
    const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");
    
    // 3. Build prompt with system role
    const prompt = this.buildPrompt(context, question);
    
    // 4. Query LLM
    const response = await this.langChainRAG.query(prompt);
    
    return response;
  }
}
```

### LangChain RAG Helper Class

```typescript
// src/services/LangChainRAG.ts
export class LangChainRAG {
  private vectorStore: Chroma;
  private llm: ChatOllama;
  private retriever: VectorStoreRetriever;
  
  constructor(config: RAGConfiguration) {
    this.llm = new ChatOllama({
      baseUrl: config.llmBaseUrl,
      model: config.llmModel,
      temperature: config.temperature,
    });
    
    // Initialize vector store and retriever
    // ...
  }
  
  async retrieve(query: string): Promise<Document[]> {
    return this.retriever.getRelevantDocuments(query);
  }
  
  async query(prompt: ChatPromptTemplate): Promise<string> {
    const chain = prompt.pipe(this.llm);
    const response = await chain.invoke({});
    return response.content;
  }
}
```

---

## 11. Error Handling Strategy

### Failure Scenarios

| Scenario | Detection | Recovery |
|----------|-----------|----------|
| **ChromaDB offline** | Connection error on init | Display error, fallback to AnythingLLM |
| **Ollama offline** | Connection error on embed/query | Display error, suggest starting Ollama |
| **Document too large** | File size > 50MB | Reject upload, show size limit |
| **Unsupported format** | Unknown file extension | Show supported formats |
| **Embedding timeout** | Ollama timeout (>60s) | Retry with exponential backoff |
| **No relevant chunks** | Similarity < threshold | Return "No relevant information found" |

### Error Messages

```typescript
export const RAG_ERROR_MESSAGES = {
  CHROMADB_OFFLINE: "ChromaDB is not running. Please start ChromaDB server.",
  OLLAMA_OFFLINE: "Ollama is not running. Please start Ollama.",
  FILE_TOO_LARGE: "File exceeds 50MB limit. Please use a smaller file.",
  UNSUPPORTED_FORMAT: "Unsupported file format. Please use PDF, TXT, or DOCX.",
  NO_DOCUMENTS: "No documents uploaded. Please upload at least one document.",
  NO_RELEVANT_CHUNKS: "No relevant information found in documents.",
};
```

---

## 12. Performance Optimization

### Batch Processing

- **Embedding**: Process 10-20 chunks at once
- **Retrieval**: Single query, multiple results
- **Benefit**: Reduce API calls, faster processing

### Caching

- **Embedding Cache**: Store in ChromaDB metadata
- **Query Cache**: Cache recent queries (LRU, max 100)
- **Benefit**: Avoid redundant computations

### Lazy Loading

- **Vector Store**: Initialize only when needed
- **Documents**: Load metadata first, content on demand
- **Benefit**: Faster app startup

---

## 13. Migration Path

### Phase 1: Parallel Implementation (Current Sprint)
- Keep AnythingLLM working
- Add LangChain as separate code path
- UI toggle to switch between modes

### Phase 2: Testing & Validation
- Compare answer quality (AnythingLLM vs LangChain)
- Benchmark performance
- User testing with both modes

### Phase 3: Default Switch
- Make LangChain default
- Keep AnythingLLM as fallback option
- Document migration guide

---

## 14. Testing Strategy

### Unit Tests

- **DocumentLoader**: Test each format (PDF, TXT, DOCX)
- **TextSplitter**: Verify chunk size, overlap, boundaries
- **EmbeddingService**: Mock Ollama, test batching
- **VectorStoreManager**: Mock ChromaDB, test CRUD operations

### Integration Tests

- **End-to-End RAG**: Upload → Embed → Query → Retrieve
- **Retrieval Quality**: Verify relevant chunks returned
- **System Prompt**: Verify ICH-form responses
- **Error Handling**: Test all failure scenarios

### Performance Tests

- **Embedding Speed**: <5s for 100 chunks
- **Retrieval Speed**: <1s for similarity search
- **Memory Usage**: <500MB for 100 documents

---

## 15. UI/UX Considerations

### Document Management UI

**Location**: Settings Panel → "Documents" Tab

**Features**:
- Drag-and-drop upload
- Document list with metadata (filename, type, chunks, upload date)
- Delete document button
- Embedding progress indicator
- Total documents count

### RAG Configuration UI

**Location**: Settings Panel → "RAG Settings" Tab

**Features**:
- Mode selector: AnythingLLM / LangChain
- Chunk size slider (500-2000 tokens)
- Top-k slider (3-10 chunks)
- Embedding model dropdown
- Vector store status indicator

---

## Decision Summary

| Component | Decision | Rationale |
|-----------|----------|-----------|
| **Framework** | LangChain.js | Better TS support, larger community |
| **Vector Store** | ChromaDB | Easy local setup, good performance |
| **Embedding** | nomic-embed-text | Optimized for RAG, fast, local |
| **Chunking** | 1000 tokens, 200 overlap | Proven for long documents |
| **Retrieval** | Similarity search (top-5) | Simple, effective, configurable |
| **LLM** | Qwen2.5:7B via Ollama | Already tested, works perfectly |
| **Architecture** | Dual-support | Gradual migration, user choice |

---

## Next Steps

1. **T053**: Update data model with DocumentSource and RAGConfiguration entities
2. **T054**: Install LangChain.js dependencies
3. **T055-T058**: Implement core services (DocumentLoader, TextSplitter, EmbeddingService, VectorStoreManager)
4. **T059**: Refactor WitnessAgent for dual-mode support
5. **T060-T061**: Build UI components for document management and RAG settings

**Estimated Timeline**: 26-39 hours total (from T051-T068)