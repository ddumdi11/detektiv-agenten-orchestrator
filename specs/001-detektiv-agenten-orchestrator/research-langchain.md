# LangChain.js vs LlamaIndex.TS Research

**Task**: T051 - Research LangChain.js vs LlamaIndex.TS for TypeScript integration
**Date**: 2025-10-07
**Branch**: 007-langchain-rag-integration

## Executive Summary

**Recommendation**: **LangChain.js** for this project

**Key Reasons**:
1. More mature TypeScript support and ecosystem
2. Better documentation and community resources
3. Seamless Ollama integration out-of-the-box
4. More flexible for our detective-witness interrogation pattern
5. Larger selection of vector store integrations

---

## Comparison Matrix

| Aspect | LangChain.js | LlamaIndex.TS | Winner |
|--------|--------------|---------------|--------|
| **TypeScript Support** | Native, first-class | Port from Python, less mature | LangChain.js |
| **Documentation** | Extensive, many examples | Growing, fewer TS examples | LangChain.js |
| **Ollama Integration** | Built-in ChatOllama class | Supported but less documented | LangChain.js |
| **Vector Stores** | 20+ integrations (Chroma, Milvus, Lance, etc.) | 10+ integrations | LangChain.js |
| **Community** | Larger, more active | Smaller but growing | LangChain.js |
| **RAG Flexibility** | Highly modular chains | More opinionated structure | LangChain.js |
| **Learning Curve** | Moderate (many concepts) | Steeper (Python-centric docs) | LangChain.js |
| **Performance** | Good, optimized for Node.js | Good, similar performance | Tie |
| **Maintenance** | Very active (weekly releases) | Active (monthly releases) | LangChain.js |

---

## LangChain.js Deep Dive

### Pros for Our Use Case

1. **Modular Chain Architecture**
   - Perfect for our detective-witness pattern
   - Can build custom chains for interrogation flow
   - Easy to inject system prompts at each step

2. **Ollama Integration**
   ```typescript
   import { ChatOllama } from "@langchain/community/chat_models/ollama";
   import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
   
   const llm = new ChatOllama({
     baseUrl: "http://localhost:11434",
     model: "qwen2.5:7b",
     temperature: 0.1,
   });
   
   const embeddings = new OllamaEmbeddings({
     model: "nomic-embed-text",
     baseUrl: "http://localhost:11434",
   });
   ```

3. **Vector Store Options**
   - **ChromaDB**: Recommended for local desktop apps
     ```typescript
     import { Chroma } from "@langchain/community/vectorstores/chroma";
     
     const vectorStore = await Chroma.fromDocuments(
       docs,
       embeddings,
       { collectionName: "witness-documents" }
     );
     ```
   - **Milvus**: Better for large-scale (overkill for desktop)
   - **LanceDB**: Good alternative, pure TypeScript

4. **Document Loaders**
   ```typescript
   import { PDFLoader } from "langchain/document_loaders/fs/pdf";
   import { TextLoader } from "langchain/document_loaders/fs/text";
   import { DocxLoader } from "langchain/document_loaders/fs/docx";
   ```

5. **Text Splitting**
   ```typescript
   import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
   
   const splitter = new RecursiveCharacterTextSplitter({
     chunkSize: 1000,
     chunkOverlap: 200,
   });
   ```

6. **Retrieval Chain with System Prompts**
   ```typescript
   import { ChatPromptTemplate } from "@langchain/core/prompts";
   import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
   
   const prompt = ChatPromptTemplate.fromMessages([
     ["system", "Du bist ein Zeuge. Antworte in ICH-Form basierend NUR auf: {context}"],
     ["human", "{input}"],
   ]);
   
   const chain = await createStuffDocumentsChain({
     llm,
     prompt,
   });
   ```

### Cons

1. **Complexity**: Many concepts to learn (chains, prompts, retrievers, etc.)
2. **Bundle Size**: Larger than LlamaIndex.TS (~2MB vs ~1MB)
3. **Breaking Changes**: Frequent updates can break code

---

## LlamaIndex.TS Deep Dive

### Pros

1. **Simpler API** - More opinionated, less configuration
2. **Python Parity** - If team knows Python LlamaIndex
3. **Smaller Bundle** - Lighter weight

### Cons for Our Use Case

1. **Less Mature TypeScript** - Ported from Python, TS is secondary
2. **Fewer Examples** - Most docs are Python-focused
3. **Less Flexible** - More opinionated structure harder to customize for detective-witness pattern
4. **Smaller Community** - Fewer StackOverflow answers, GitHub issues

---

## Vector Store Recommendation: ChromaDB

### Why ChromaDB?

1. **Easy Local Setup**
   - Runs as HTTP server: `docker run -p 8000:8000 chromadb/chroma`
   - Or Python: `pip install chromadb && chroma run`
   - No complex configuration

2. **Good Performance**
   - Fast similarity search for desktop-scale data
   - Efficient for 100-1000 documents

3. **LangChain Integration**
   - Well-supported, many examples
   - Simple API

4. **Persistence**
   - Stores vectors locally
   - Survives app restarts

### Alternatives Considered

- **Milvus**: Overkill for desktop app, complex setup
- **LanceDB**: Good alternative, pure TS, but less mature
- **Pinecone/Weaviate**: Cloud-based, not suitable for offline requirement

---

## Embedding Model Recommendation: nomic-embed-text

### Why nomic-embed-text?

1. **Optimized for RAG**
   - Specifically trained for retrieval tasks
   - Better than general-purpose embeddings

2. **Fast**
   - Smaller model (~274MB)
   - Quick embedding generation

3. **Ollama Support**
   - `ollama pull nomic-embed-text`
   - Runs locally, no API calls

4. **Good Quality**
   - Competitive with OpenAI embeddings
   - Excellent for German + English text

### Alternatives Considered

- **all-minilm**: Smaller, faster, but lower quality
- **bge-large**: Higher quality, but slower and larger
- **OpenAI embeddings**: Requires API calls, not offline

---

## Implementation Recommendations

### 1. Dual-Support Architecture

```typescript
// src/agents/WitnessAgent.ts
export class WitnessAgent {
  private mode: 'anythingllm' | 'langchain';
  
  async ask(question: string): Promise<string> {
    if (this.mode === 'anythingllm') {
      return this.askAnythingLLM(question);
    } else {
      return this.askLangChain(question);
    }
  }
}
```

### 2. Migration Strategy

**Phase 1**: Keep AnythingLLM working (current)
**Phase 2**: Add LangChain as option
**Phase 3**: Make LangChain default, keep AnythingLLM as fallback

### 3. Configuration UI

Add to Settings Panel:
- RAG Mode selector: AnythingLLM / LangChain
- Document upload (only for LangChain mode)
- Chunking parameters (only for LangChain mode)
- Embedding model selector (only for LangChain mode)

---

## Estimated Effort

| Task Category | Estimated Time |
|---------------|----------------|
| T051-T053 (Research & Design) | 2-4 hours |
| T054-T058 (Core Services) | 8-12 hours |
| T059 (WitnessAgent Refactor) | 4-6 hours |
| T060-T061 (UI Components) | 4-6 hours |
| T062-T065 (Testing) | 6-8 hours |
| T066-T068 (Documentation) | 2-3 hours |
| **Total** | **26-39 hours** |

---

## Decision: LangChain.js

**Final Recommendation**: Use **LangChain.js** with **ChromaDB** and **nomic-embed-text**

**Rationale**:
- Better TypeScript ecosystem
- More flexible for our custom interrogation pattern
- Easier Ollama integration
- Larger community for support
- ChromaDB simple local setup
- nomic-embed-text optimized for RAG

**Next Steps**:
1. Proceed to T052 (RAG Pipeline Architecture Design)
2. Install dependencies (T054)
3. Begin implementation of core services (T055-T058)