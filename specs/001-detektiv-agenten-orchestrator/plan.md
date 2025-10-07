# Implementation Plan: Detektiv-Agenten-Orchestrator MVP

**Branch**: `001-detektiv-agenten-orchestrator` | **Date**: 2025-10-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-detektiv-agenten-orchestrator/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
2. Fill Technical Context ✓
   → Project Type: Desktop application (Electron)
   → Structure Decision: Single-project with frontend/backend separation
3. Fill Constitution Check section ✓
4. Evaluate Constitution Check → PASS ✓
5. Execute Phase 0 → research.md (IN PROGRESS)
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
7. Re-evaluate Constitution Check
8. Plan Phase 2 → Task generation approach
9. STOP - Ready for /tasks command
```

## Summary

Build an MVP desktop application that uses cloud-based LLMs (detective agents) to systematically interrogate local LLMs (witness agents) through iterative questioning. The system detects gaps in responses, asks follow-up questions, and produces comprehensive audit reports with consistency scoring. Key capabilities include configurable iteration limits (5-20), automatic session persistence, provider failover with audit trails, and configurable timeouts per LLM type.

**Technical Approach**: Electron desktop app with React frontend, TypeScript backend orchestration layer, unified API clients for cloud providers (OpenAI/Anthropic/Google) and local Ollama integration, JSON-based session storage with encrypted credentials.

**Phase 2 Enhancement**: Migration to LangChain.js-based RAG pipeline for direct control over document retrieval, chunking strategies, and embedding. Dual-support architecture allows users to choose between AnythingLLM (quick-start) or LangChain (advanced control). ChromaDB vector store with nomic-embed-text embeddings via Ollama.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18.x LTS
**Primary Dependencies**:
  - Core: Electron 27+, React 18+, Tailwind CSS, Axios (HTTP), Zustand (state management)
  - RAG (Phase 2): LangChain.js, ChromaDB (HTTP client), Ollama (embeddings + LLM)
  - Document Processing: pdf-parse, mammoth (DOCX), langchain/text-splitter
**Storage**:
  - Sessions/Config: JSON files, Electron Store (encrypted credentials)
  - Vectors (Phase 2): ChromaDB local instance
**Testing**: Jest for unit tests, Playwright for E2E testing
**Target Platform**: Windows 10+, cross-platform desktop (Electron)
**Project Type**: Desktop application (single codebase with renderer/main process separation)
**Performance Goals**:
  - <2s interrogation iteration turnaround (AnythingLLM mode)
  - <3s with LangChain RAG (includes embedding + retrieval)
  - <500ms UI response for user actions
**Constraints**:
  - Configurable timeouts: Cloud APIs 15-120s, Local LLMs 15-360s
  - Single active session at a time
  - Must support offline credential management (no external auth services)
  - ChromaDB must run locally (no external vector DB services)
**Scale/Scope**:
  - MVP (Phase 1): AnythingLLM integration (current implementation)
  - Phase 2: LangChain.js RAG pipeline with dual-support
  - Session storage: unlimited history (user manages)
  - Iteration limit: 5-20 per session
  - Document limit: 100 documents per workspace (Phase 2)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Alignment with Constitution Principles

✅ **Tech Stack Compliance**:
- Electron + React + TypeScript → Matches constitution Arch-Prinzip 1
- Tailwind CSS → Matches constitution requirement
- Axios for API layer → As specified
- Zustand/Redux for state → As specified

✅ **Architecture Compliance**:
- MVP focuses on OpenAI + Ollama (constitution Phase 1 requirement)
- Core modules match constitution structure:
  - `agents/DetectiveAgent.ts` → Verhör-Logik
  - `agents/WitnessInterface.ts` → Zeugen-LLM-Wrapper
  - `agents/AnalysisEngine.ts` → Lücken-Prüfung
  - `api/CloudLLMClient.ts` → Unified cloud API
  - `api/OllamaClient.ts` → Local integration

✅ **Security Requirements**:
- API keys encrypted in Electron Store (constitution Sicherheit requirement)
- No keys in Git (enforced)
- Input sanitization against prompt injection

✅ **MVP Scope**:
- Phase 1 deliverables align with constitution Sprint 1 goals
- Single cloud LLM + Ollama (extensible for Phase 2)

**No Constitution Violations** - All design choices align with established principles.

## Project Structure

### Documentation (this feature)
```
specs/001-detektiv-agenten-orchestrator/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (to be created)
├── data-model.md        # Phase 1 output (to be created)
├── quickstart.md        # Phase 1 output (to be created)
├── contracts/           # Phase 1 output (to be created)
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
src/
├── main/                # Electron main process
│   ├── index.ts         # App entry point
│   └── config/
│       └── ConfigManager.ts  # Encrypted config storage
├── renderer/            # React frontend
│   ├── components/
│   │   ├── StrategyInput.tsx
│   │   ├── InterrogationFlow.tsx
│   │   └── ConclusionView.tsx
│   ├── store/
│   │   └── interrogationStore.ts
│   └── App.tsx
├── agents/              # Core interrogation logic
│   ├── DetectiveAgent.ts
│   ├── WitnessInterface.ts
│   └── AnalysisEngine.ts
├── api/                 # LLM integrations
│   ├── CloudLLMClient.ts
│   └── OllamaClient.ts
├── models/              # Data entities
│   ├── InterrogationSession.ts
│   ├── QuestionAnswerPair.ts
│   └── AuditResult.ts
└── services/            # Business logic
    ├── SessionManager.ts
    └── ProviderFallbackService.ts

tests/
├── unit/
│   ├── agents/
│   ├── api/
│   └── services/
└── e2e/
    └── interrogation-flow.spec.ts

public/                  # Electron static assets
package.json
tsconfig.json
electron.config.js
```

**Structure Decision**: Electron desktop application with clear separation between main process (Node.js backend, API clients, file I/O) and renderer process (React UI). Follows Electron best practices with IPC for secure main↔renderer communication. TypeScript strict mode throughout for type safety.

## Phase 0: Outline & Research

### Research Tasks

1. **Electron + React + TypeScript Setup**
   - Research: Best practices for Electron Forge vs Vite + Electron setup in 2025
   - Research: IPC patterns for secure main↔renderer communication
   - Research: electron-store for encrypted credential storage

2. **LLM API Integration Patterns**
   - Research: Unified abstraction for OpenAI/Anthropic/Google Gemini APIs
   - Research: Ollama API integration (local endpoint patterns)
   - Research: Rate limit detection and automatic fallback strategies
   - Research: Timeout handling with AbortController

3. **Session Persistence**
   - Research: JSON schema validation for session data
   - Research: Electron app data directories (userData path)
   - Research: Incremental session saving vs full writes

4. **State Management**
   - Research: Zustand vs Redux for complex async flows
   - Research: Real-time UI updates during interrogation loop
   - Research: Handling long-running async operations in Electron renderer

5. **Testing Strategy**
   - Research: Jest + Electron testing setup
   - Research: Mocking LLM APIs for unit tests
   - Research: Playwright for Electron E2E testing

**Output**: `research.md` with decisions for each area

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### 1. Data Model (`data-model.md`)

Entities extracted from spec (Key Entities section):

**Core Entities**:
- `Hypothesis` (text, timestamp)
- `InterrogationSession` (id, start, end, status, hypothesis, iteration_limit, audit_trail)
- `QuestionAnswerPair` (sequence, question, answer, timestamp, gap_analysis, provider_used)
- `AuditResult` (consistency_score, contradictions[], gaps[], summary)
- `Configuration` (credentials, models, timeouts, fallback_order, iteration_default)
- `GapAnalysis` (gaps[], categories[], completeness_score)

**Relationships**:
- 1 Hypothesis → 1 InterrogationSession
- 1 InterrogationSession → N QuestionAnswerPairs
- 1 InterrogationSession → 1 AuditResult
- 1 QuestionAnswerPair → 1 GapAnalysis

### 2. API Contracts (`contracts/`)

**From Functional Requirements**:

**Interrogation Contracts**:
- `POST /interrogation/start` → Start new session (FR-019)
  - Input: { hypothesis, iteration_limit, detective_provider, witness_model }
  - Output: { session_id, status }

- `POST /interrogation/stop` → Stop running session (FR-020)
  - Input: { session_id }
  - Output: { status, partial_results }

- `GET /interrogation/status/{session_id}` → Get real-time progress (FR-011, FR-012)
  - Output: { current_iteration, qa_pairs[], status }

**Session Management Contracts**:
- `GET /sessions` → List all saved sessions (FR-022)
  - Output: { sessions: [{ id, hypothesis, timestamp, status }] }

- `GET /sessions/{session_id}` → Load specific session (FR-023)
  - Output: { full session data }

**Configuration Contracts**:
- `PUT /config/credentials` → Update API keys (FR-030, FR-032)
  - Input: { provider, api_key, model }

- `PUT /config/timeouts` → Set timeout preferences (FR-034, FR-035)
  - Input: { cloud_timeout, local_timeout }

**Internal Agent Contracts** (TypeScript interfaces):
- `DetectiveAgent.generateQuestion(context): Promise<string>`
- `DetectiveAgent.analyzeGaps(answer): Promise<GapAnalysis>`
- `WitnessInterface.respond(question): Promise<string>`
- `AnalysisEngine.scoreConsistency(session): Promise<number>`

### 3. Contract Tests

Generate failing tests for each endpoint/interface:
- `tests/unit/api/interrogation.test.ts`
- `tests/unit/agents/detective.test.ts`
- `tests/unit/agents/witness.test.ts`
- `tests/unit/services/session-manager.test.ts`

### 4. Quickstart Test Scenario (`quickstart.md`)

From Primary User Story (spec line 54-56):
```gherkin
Scenario: Complete interrogation flow
  Given user opens app with configured API credentials
  When user enters "Summarize health benefits of Vitamin B3"
  And sets iteration limit to 10
  And clicks "Start Interrogation"
  Then system displays live Q&A pairs
  And detective asks follow-up questions when gaps detected
  And interrogation completes when detective satisfied OR limit reached
  And user sees consistency score, contradictions list, final summary
  And session is automatically saved
```

### 5. Agent Context File

Update `CLAUDE.md` at repository root:
- Add Electron + React + TypeScript stack
- Add key modules: agents/, api/, models/
- Add recent changes from this plan
- Keep under 150 lines

**Output**: `data-model.md`, `/contracts/*.json`, failing test files, `quickstart.md`, `CLAUDE.md`

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md`
2. Extract from Phase 1 outputs:
   - 6 data model entities → 6 model creation tasks
   - 7 API endpoints → 7 contract test tasks
   - 4 core agent interfaces → 4 agent implementation tasks
   - 5 acceptance scenarios → 5 E2E test tasks
   - Configuration + session persistence → 2 infrastructure tasks

**Ordering Strategy** (TDD + Dependency order):
1. **Setup Tasks** [P]:
   - Electron + React project scaffolding
   - TypeScript config + linting
   - Test framework setup

2. **Model Layer** [P] (parallel - independent files):
   - Create all 6 entity models with TypeScript interfaces

3. **Contract Tests** (sequential - defines interfaces):
   - Write failing tests for each contract

4. **Infrastructure** [P]:
   - ConfigManager (encrypted storage)
   - SessionManager (JSON persistence)

5. **API Clients** [P]:
   - CloudLLMClient implementation
   - OllamaClient implementation
   - Fallback service

6. **Agent Layer** (sequential - dependencies):
   - WitnessInterface implementation
   - DetectiveAgent implementation
   - AnalysisEngine implementation

7. **UI Components** [P]:
   - StrategyInput
   - InterrogationFlow (real-time updates)
   - ConclusionView

8. **Integration Tests**:
   - End-to-end interrogation flow tests

9. **Quickstart Validation**:
   - Execute quickstart.md scenario

**Estimated Output**: ~35-40 numbered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, validate acceptance criteria)

## Complexity Tracking

*No constitution violations - this section is empty*

### Constitution Clarifications

The following clarifications supersede initial constitution assumptions:

| Constitution Statement | Clarified Implementation | Rationale |
|------------------------|--------------------------|-----------|
| "LocalStorage + JSON-Files" (constitution.md:L21) | **Electron Store** (encrypted) + JSON files | "LocalStorage" was conceptual; actual implementation uses Electron Store (secure, encrypted) not browser localStorage API |
| "API-Calls mit Timeout (30s Maximum)" (constitution.md:L286) | **Configurable**: Cloud 15-120s, Local 15-360s | User clarifications (spec.md:L48) established configurable ranges; 30s was initial assumption before requirements analysis |

These clarifications were resolved during `/clarify` phase and are documented in spec.md Clarifications section.

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete → [research.md](./research.md)
- [x] Phase 1: Design complete → [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)
- [x] Phase 2: Task planning complete (approach described above)
- [x] Phase 3: Tasks generated (/tasks command) → [tasks.md](./tasks.md) (50 tasks)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS (all design choices align with constitution)
- [x] All NEEDS CLARIFICATION resolved (2 low-impact items deferred to implementation: FR-033, FR-037)
- [x] Complexity deviations documented (none)

**Artifacts Generated**:
- [x] research.md - Technical decisions for Electron, LLM APIs, state management, testing
- [x] data-model.md - 6 entities with TypeScript interfaces, validation rules, relationships
- [x] contracts/interrogation-api.json - OpenAPI spec for interrogation endpoints
- [x] contracts/session-api.json - OpenAPI spec for session management
- [x] contracts/config-api.json - OpenAPI spec for configuration
- [x] contracts/agent-interfaces.ts - TypeScript interfaces for agent layer
- [x] quickstart.md - Integration test scenario validating primary user story
- [x] CLAUDE.md - Updated agent context file

---
*Based on Constitution from `.specify/memory/constitution.md`*
