# Detektiv-Agenten-Orchestrator

Desktop application that uses cloud-based LLMs (detective agents) to systematically interrogate document-based knowledge through advanced RAG (Retrieval-Augmented Generation) technology.

## Features

### Core Functionality
- **Dual-Mode Interrogation**: Choose between AnythingLLM (quick-start) or LangChain RAG (advanced)
- **Iterative Questioning**: Cloud LLM generates follow-up questions based on gaps and inconsistencies
- **Document-Based RAG**: Upload and analyze PDF, TXT, and DOCX documents with semantic search
- **Gap Analysis**: Automatic detection of missing information, ambiguities, and contradictions

### AI & Data
- **Multi-Provider Support**: OpenAI GPT-4, Anthropic Claude, Google Gemini (detective agents)
- **Local RAG Pipeline**: Ollama + ChromaDB for document processing and retrieval
- **Provider Fallback**: Automatic switching on rate limits with full audit trail
- **Session Persistence**: Save and review past interrogation sessions with detailed findings

### Advanced Features
- **Document Management**: Upload, process, and manage multiple documents
- **Vector Embeddings**: Semantic search with nomic-embed-text model
- **Configurable Chunking**: Adjustable text splitting for optimal retrieval
- **Real-time Processing**: Background document embedding with progress tracking
- **Audit Results**: Consistency scoring, contradiction detection, comprehensive summaries

## Prerequisites

See [SETUP.md](SETUP.md) for detailed Windows build requirements:

### Required Software
- **Node.js**: Version 18.x LTS or newer
- **Python**: Version 3.8+ (for ChromaDB vector database)
- **Visual Studio 2022** (≥17.0.0) with MSVC v143 Build Tools

### AI Services
- **Ollama**: Local LLM runtime (for embeddings and generation)
  - Required models: `nomic-embed-text`, `qwen2:7b-instruct` (or similar)
- **ChromaDB**: Vector database for document storage
  - Runs as Python service on port 8000
- **API Keys**: At least one cloud LLM provider (OpenAI, Anthropic, or Gemini)

### Optional (for AnythingLLM mode)
- **AnythingLLM**: Alternative witness agent (workspace-based)

## Installation

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd detektiv-agenten-orchestrator
npm install
```

### 2. Set up Python Environment for ChromaDB
```bash
# Create isolated Python environment
py -m venv chroma-env

# Activate environment and install ChromaDB
chroma-env\Scripts\activate
pip install chromadb
```

### 3. Install Ollama Models
```bash
# Pull required models
ollama pull nomic-embed-text    # For document embeddings
ollama pull qwen2:7b-instruct   # For answer generation (or your preferred model)
```

## Quick Start

### Start Required Services
```bash
# Terminal 1: Start ChromaDB vector database
chroma-env\Scripts\activate
chroma run --host 0.0.0.0 --port 8000

# Terminal 2: Start Ollama (if not running)
ollama serve

# Terminal 3: Start the application
npm start
```

### First Use Setup
1. **Configure Cloud Providers**: Add API keys for OpenAI, Anthropic, or Gemini
2. **Upload Documents**: Use the Document Management tab to upload PDF/TXT/DOCX files
3. **Start Interrogation**: Select LangChain RAG mode and begin questioning your documents

## Development

```bash
# Start development server
npm start

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint
```

## Building

```bash
# Package application
npm run package

# Create distributable
npm run make
```

## Configuration

### Application Settings
On first launch, configure:
1. **Cloud API Credentials**: OpenAI, Anthropic, or Gemini API keys
2. **Ollama Settings**: Base URL (default: http://localhost:11434)
3. **ChromaDB Settings**: Base URL (default: http://localhost:8000)
4. **Timeout Preferences**: Cloud (15-120s), Local (15-360s)
5. **Provider Fallback**: Order for automatic switching
6. **Iteration Limits**: 5-20 questions per interrogation

### RAG Settings (Advanced)
Fine-tune document processing:
- **Chunk Size**: Text splitting size (500-2000 characters)
- **Chunk Overlap**: Overlap between chunks (0-500 characters)
- **Embedding Model**: nomic-embed-text (recommended)
- **Retrieval K**: Number of chunks to retrieve (1-20)
- **Score Threshold**: Minimum similarity score (0-1)
- **Generation Model**: qwen2:7b-instruct or similar

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── index.ts            # Application entry point
│   ├── InterrogationOrchestrator.ts  # Session management
│   ├── ipc-handlers.ts     # IPC communication handlers
│   └── preload.ts          # Context bridge for renderer
├── renderer/               # React frontend
│   ├── App.tsx            # Main application component
│   ├── index.tsx          # React entry point
│   ├── preload.d.ts       # TypeScript definitions
│   ├── components/        # UI components
│   │   ├── DocumentManagement.tsx    # Document upload/processing
│   │   ├── InterrogationForm.tsx     # Question input
│   │   ├── ProgressDisplay.tsx       # Real-time progress
│   │   ├── RAGSettings.tsx          # RAG configuration
│   │   ├── SessionDetail.tsx        # Session results
│   │   └── SessionHistory.tsx       # Past sessions
│   └── constants/         # Application constants
├── agents/                # AI agent implementations
│   ├── DetectiveAgent.ts  # Cloud LLM question generation
│   ├── WitnessAgent.ts    # Dual-mode witness (AnythingLLM/LangChain)
│   └── README.md          # Agent documentation
├── services/              # Business logic services
│   ├── DocumentLoader.ts  # File loading (PDF/TXT/DOCX)
│   ├── TextSplitter.ts    # Document chunking
│   ├── EmbeddingService.ts # Ollama embeddings
│   └── VectorStoreManager.ts # ChromaDB integration
└── models/                # Data entities and types

tests/
├── unit/                  # Jest unit tests
│   ├── agents/           # Agent logic tests
│   ├── api/              # API client tests
│   ├── services/         # Service layer tests
│   └── sample/           # Test utilities
└── e2e/                   # Playwright E2E tests

chroma-env/               # Isolated Python environment for ChromaDB
temp-documents/           # Temporary document storage
specs/                    # Project specifications and documentation
```

## Usage Guide

### Interrogation Modes

#### LangChain RAG Mode (Recommended)
- **Best for**: Document analysis, research, detailed investigations
- **Features**: Semantic search, context-aware answers, document citations
- **Requirements**: ChromaDB + Ollama running
- **Documents**: Upload PDF, TXT, DOCX files for analysis

#### AnythingLLM Mode (Quick Start)
- **Best for**: General questions, conversational AI
- **Features**: Workspace-based knowledge, fast setup
- **Requirements**: AnythingLLM instance running
- **Documents**: Pre-loaded in AnythingLLM workspace

### Document Processing
1. **Upload**: Drag & drop or browse files (max 50MB each)
2. **Processing**: Automatic chunking and embedding (background)
3. **Search**: Semantic retrieval finds relevant content
4. **Generation**: Context-aware answers with citations

### Troubleshooting

#### ChromaDB Connection Issues
```bash
# Check if ChromaDB is running
curl http://localhost:8000/api/v1/heartbeat

# Start ChromaDB if needed
chroma-env\Scripts\activate
chroma run --host 0.0.0.0 --port 8000
```

#### Ollama Model Issues
```bash
# Check available models
ollama list

# Pull required models
ollama pull nomic-embed-text
ollama pull qwen2:7b-instruct
```

#### Document Processing Stuck
- Check Ollama and ChromaDB are running
- Verify document file is not corrupted
- Check application logs for specific errors

## Documentation

- [Setup Guide](SETUP.md) - Development environment requirements
- [Contributing](CONTRIBUTING.md) - Git workflow and code standards
- [LangChain RAG Architecture](specs/001-detektiv-agenten-orchestrator/rag-architecture.md) - Technical implementation
- [Research Findings](specs/001-detektiv-agenten-orchestrator/research-langchain.md) - LangChain vs LlamaIndex comparison
- [Data Model v2](specs/001-detektiv-agenten-orchestrator/data-model-v2.md) - RAG integration design
- [Specification](specs/001-detektiv-agenten-orchestrator/spec.md) - Feature requirements
- [Implementation Plan](specs/001-detektiv-agenten-orchestrator/plan.md) - Architecture decisions

## License

MIT
