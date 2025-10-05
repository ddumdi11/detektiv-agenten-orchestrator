# Tasks: Detektiv-Agenten-Orchestrator MVP

**Input**: Design documents from `specs/001-detektiv-agenten-orchestrator/`
**Prerequisites**: [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

## Execution Flow (main)
```
1. Load plan.md ✓ - Tech stack: Electron + React + TypeScript
2. Load design documents ✓
   → data-model.md: 6 entities (Hypothesis, InterrogationSession, QuestionAnswerPair, GapAnalysis, AuditResult, Configuration)
   → contracts/: 3 API specs + agent interfaces
   → research.md: Decisions on Electron Forge, Zustand, electron-store, MSW testing
3. Generate tasks by category ✓
4. Apply task rules ✓ (TDD, parallel marking)
5. Number tasks ✓ (T001-T050, T038a added during remediation)
6. Dependencies mapped ✓
7. Parallel examples included ✓
8. Validation complete ✓
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
Project structure (from [plan.md](./plan.md)):
```
src/
├── main/          # Electron main process
├── renderer/      # React frontend
├── agents/        # Detective/Witness logic
├── api/           # LLM clients
├── models/        # Data entities
└── services/      # Business logic

tests/
├── unit/          # Jest unit tests
└── e2e/           # Playwright E2E tests
```

---

## Phase 3.1: Setup

- [ ] **T001** Create project structure per implementation plan
  - Initialize Electron Forge project with Vite + TypeScript template
  - Create directories: `src/main/`, `src/renderer/`, `src/agents/`, `src/api/`, `src/models/`, `src/services/`
  - Create test directories: `tests/unit/`, `tests/e2e/`
  - File: Project root structure

- [ ] **T002** Initialize TypeScript + Electron dependencies
  - Install: `electron`, `@electron-forge/cli`, `@electron-forge/plugin-vite`
  - Install React: `react`, `react-dom`, `@types/react`
  - Install deps: `axios`, `zustand`, `immer`, `electron-store`
  - Install dev deps: `typescript@5.x`, `vite`, `tailwindcss`
  - File: `package.json`

- [ ] **T003** [P] Configure linting and formatting tools
  - Setup ESLint with TypeScript rules
  - Configure Prettier
  - Add `tsconfig.json` (strict mode enabled)
  - Add `.eslintrc.json`, `.prettierrc`
  - Files: Configuration files at project root

- [ ] **T004** [P] Configure testing frameworks
  - Install Jest + @electron/test-utils for unit tests
  - Install Playwright for Electron E2E tests
  - Install MSW (Mock Service Worker) for API mocking
  - Configure `jest.config.main.js` and `jest.config.renderer.js`
  - Files: Test configuration files

- [ ] **T005** [P] Setup Tailwind CSS for React renderer
  - Install Tailwind CSS + PostCSS + Autoprefixer
  - Configure `tailwind.config.js`
  - Create `src/renderer/index.css` with Tailwind directives
  - Files: `tailwind.config.js`, `src/renderer/index.css`

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (Parallel - Different Files)

- [ ] **T006** [P] Contract test for interrogation start endpoint
  - Test `POST /interrogation/start` per `contracts/interrogation-api.json`
  - Validate request schema (hypothesis, iterationLimit, detectiveProvider, witnessModel)
  - Validate response schema (sessionId, status)
  - Test must FAIL (no implementation yet)
  - File: `tests/unit/api/interrogation-start.test.ts`

- [ ] **T007** [P] Contract test for interrogation stop endpoint
  - Test `POST /interrogation/stop` per `contracts/interrogation-api.json`
  - Validate request/response schemas
  - Test must FAIL
  - File: `tests/unit/api/interrogation-stop.test.ts`

- [ ] **T008** [P] Contract test for interrogation status endpoint
  - Test `GET /interrogation/status/{sessionId}` per `contracts/interrogation-api.json`
  - Validate response schema (currentIteration, qaPairs, status)
  - Test must FAIL
  - File: `tests/unit/api/interrogation-status.test.ts`

- [ ] **T009** [P] Contract test for session list endpoint
  - Test `GET /sessions` per `contracts/session-api.json`
  - Validate response schema (sessions array)
  - Test must FAIL
  - File: `tests/unit/api/session-list.test.ts`

- [ ] **T010** [P] Contract test for session load endpoint
  - Test `GET /sessions/{sessionId}` per `contracts/session-api.json`
  - Validate full session schema
  - Test must FAIL
  - File: `tests/unit/api/session-load.test.ts`

- [ ] **T011** [P] Contract test for config credentials endpoint
  - Test `PUT /config/credentials` per `contracts/config-api.json`
  - Validate request schema (provider, apiKey, model)
  - Test must FAIL
  - File: `tests/unit/api/config-credentials.test.ts`

- [ ] **T012** [P] Contract test for config timeouts endpoint
  - Test `PUT /config/timeouts` per `contracts/config-api.json`
  - Validate timeout ranges (cloud: 15-120, local: 15-360)
  - Test must FAIL
  - File: `tests/unit/api/config-timeouts.test.ts`

### Agent Interface Tests (Parallel - Different Files)

- [ ] **T013** [P] Contract test for DetectiveAgent interface
  - Test `generateQuestion()`, `analyzeGaps()`, `isSatisfied()` per `contracts/agent-interfaces.ts`
  - Mock LLM responses
  - Test must FAIL
  - File: `tests/unit/agents/detective-agent.test.ts`

- [ ] **T014** [P] Contract test for WitnessInterface
  - Test `respond()`, `validateConnection()` per `contracts/agent-interfaces.ts`
  - Mock Ollama API
  - Test must FAIL
  - File: `tests/unit/agents/witness-interface.test.ts`

- [ ] **T015** [P] Contract test for AnalysisEngine interface
  - Test `scoreConsistency()`, `findContradictions()`, `generateSummary()`, `audit()` per `contracts/agent-interfaces.ts`
  - Test must FAIL
  - File: `tests/unit/agents/analysis-engine.test.ts`

### Integration Tests (Parallel - Different Files)

- [ ] **T016** [P] Integration test: Complete interrogation flow
  - Based on [quickstart.md](./quickstart.md) primary scenario
  - Test: User starts interrogation → Q&A pairs appear → audit result generated → session saved
  - Use Playwright for E2E
  - Test must FAIL
  - File: `tests/e2e/interrogation-flow.spec.ts`

- [ ] **T017** [P] Integration test: Gap detection and follow-up
  - Test: Witness gives incomplete answer → Detective detects gap → Follow-up question asked
  - Test must FAIL
  - File: `tests/e2e/gap-detection.spec.ts`

- [ ] **T018** [P] Integration test: Session persistence and loading
  - Test: Complete session → Verify file saved → Load from history → Verify data intact
  - Test must FAIL
  - File: `tests/e2e/session-persistence.spec.ts`

- [ ] **T019** [P] Integration test: Provider fallback on rate limit
  - Test: Simulate rate limit on primary provider → System switches to fallback → Audit trail logged
  - Test must FAIL
  - File: `tests/e2e/provider-fallback.spec.ts`

- [ ] **T020** [P] Integration test: API validation and error handling
  - Test: Invalid credentials → Error displayed, interrogation prevented
  - Test: Ollama offline → Error displayed, connection test fails
  - Test must FAIL
  - File: `tests/e2e/api-validation.spec.ts`

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Data Models (Parallel - Different Files)

- [ ] **T021** [P] Create Hypothesis model
  - TypeScript interface per `data-model.md`
  - Validation functions (text non-empty, createdAt valid date)
  - File: `src/models/Hypothesis.ts`

- [ ] **T022** [P] Create InterrogationSession model
  - TypeScript interface with all attributes (id, hypothesis, startTime, endTime, status, iterationLimit, qaPairs, auditResult, auditTrail)
  - State transition validation (running → completed/failed/limit-reached)
  - File: `src/models/InterrogationSession.ts`

- [ ] **T023** [P] Create QuestionAnswerPair model
  - TypeScript interface (sequence, question, answer, timestamp, gapAnalysis, providerUsed)
  - Validation (sequence matches array position, providerUsed format)
  - File: `src/models/QuestionAnswerPair.ts`

- [ ] **T024** [P] Create GapAnalysis model
  - TypeScript interface (gaps array, completenessScore, requiresFollowUp)
  - Gap category enum (missing_information, ambiguity, inconsistency, vagueness)
  - File: `src/models/GapAnalysis.ts`

- [ ] **T025** [P] Create AuditResult model
  - TypeScript interface (consistencyScore, contradictions, remainingGaps, summary)
  - Validation (score 0-100, qaPairIndexes valid)
  - File: `src/models/AuditResult.ts`

- [ ] **T026** [P] Create Configuration model
  - TypeScript interface (detectives, witness, providerFallbackOrder, timeouts, defaultIterationLimit)
  - Validation (timeout ranges, at least 1 detective, exactly 1 default)
  - File: `src/models/Configuration.ts`

### Infrastructure (Sequential - Shared Dependencies)

- [ ] **T027** ConfigManager implementation with electron-store
  - Implement `loadConfig()`, `saveConfig()`, `updateCredentials()`, `updateTimeouts()`, `getDefaultDetective()`
  - Use electron-store with AES-256-GCM encryption for API keys
  - Schema validation per `data-model.md` Configuration entity
  - File: `src/main/config/ConfigManager.ts`

- [ ] **T028** SessionManager implementation with JSON persistence
  - Implement `saveIncremental()`, `saveCompleted()`, `loadSession()`, `listSessions()`, `deleteSession()`
  - Atomic write pattern (write to .tmp, then rename)
  - JSON schema validation using Ajv
  - File: `src/services/SessionManager.ts`

### LLM API Clients (Parallel - Different Files)

- [ ] **T029** [P] CloudLLMClient base implementation
  - Implement `LLMProvider` interface per `contracts/agent-interfaces.ts`
  - Unified abstraction for OpenAI/Anthropic/Gemini
  - `chat()`, `validateCredentials()`, `isRateLimitError()` methods
  - AbortController for timeout handling
  - File: `src/api/CloudLLMClient.ts`

- [ ] **T030** [P] OpenAIProvider implementation
  - Extend `CloudLLMClient`
  - OpenAI API v1/chat/completions integration
  - Rate limit detection (HTTP 429 + Retry-After header)
  - File: `src/api/providers/OpenAIProvider.ts`

- [ ] **T031** [P] OllamaClient implementation
  - Implement `WitnessInterface` and `LLMProvider`
  - Ollama v1/chat/completions endpoint (OpenAI-compatible)
  - Default base URL: http://127.0.0.1:11434/v1
  - Connection validation
  - File: `src/api/OllamaClient.ts`

- [ ] **T032** [P] ProviderFallbackService implementation
  - Implement `executeWithFallback()` per `contracts/agent-interfaces.ts`
  - Rate limit detection → automatic provider switch
  - Audit trail event generation (provider_switch)
  - File: `src/services/ProviderFallbackService.ts`

### Agent Layer (Sequential - Dependencies)

- [ ] **T033** WitnessInterface implementation
  - Implement `respond()` and `validateConnection()`
  - Use OllamaClient
  - Context handling (pass previous Q&A pairs)
  - Timeout handling with configured localTimeout
  - File: `src/agents/WitnessInterface.ts`

- [ ] **T034** DetectiveAgent implementation
  - Implement `generateQuestion()`, `analyzeGaps()`, `isSatisfied()`
  - Use CloudLLMClient with configured provider
  - LLM prompts for question generation and gap analysis
  - Parse structured LLM responses into GapAnalysis
  - File: `src/agents/DetectiveAgent.ts`

- [ ] **T035** AnalysisEngine implementation
  - Implement `scoreConsistency()`, `findContradictions()`, `generateSummary()`, `audit()`
  - Consistency scoring algorithm (base 100 - contradictions penalty - gap penalty)
  - Contradiction detection via LLM
  - Final summary generation
  - File: `src/agents/AnalysisEngine.ts`

### Main Process Orchestration

- [ ] **T036** Interrogation orchestration loop in main process
  - IPC handlers: `interrogation:start`, `interrogation:stop`, `interrogation:status`
  - Main interrogation loop:
    1. Detective generates question
    2. Witness responds
    3. Detective analyzes gaps
    4. Repeat until isSatisfied() or iteration limit
    5. AnalysisEngine produces audit
  - Session state management (single active session constraint)
  - Progress events via IPC (`interrogation:progress`)
  - File: `src/main/InterrogationOrchestrator.ts`

- [ ] **T037** IPC preload script with Context Bridge
  - Expose secure IPC API to renderer: `window.electronAPI`
  - Methods: `interrogation.start()`, `interrogation.stop()`, `interrogation.onProgress()`, `sessions.list()`, `sessions.load()`, `config.update()`
  - Use contextBridge for security (no direct Node.js access in renderer)
  - File: `src/main/preload.ts`

### React UI Components (Parallel - Different Files)

- [ ] **T038** [P] StrategyInput component
  - Hypothesis textarea input
  - Iteration limit slider (5-20)
  - Detective provider selector
  - Witness model selector
  - Start/Stop buttons (state-aware)
  - Tailwind CSS styling
  - File: `src/renderer/components/StrategyInput.tsx`

- [ ] **T038a** [P] Settings/Configuration UI component
  - API credentials input for OpenAI, Anthropic, Gemini, Ollama
  - Timeout configuration sliders (cloud: 15-120s, local: 15-360s)
  - **Provider fallback order configuration** (list with up/down buttons or drag-and-drop for reordering)
  - Accessible via application menu (Preferences/Settings)
  - Save/Cancel buttons with validation
  - File: `src/renderer/components/SettingsPanel.tsx`

- [ ] **T039** [P] InterrogationFlow component
  - Real-time Q&A pair display
  - Iteration counter
  - Progress bar
  - Gap indicators
  - Provider labels per Q&A
  - Auto-scroll to latest
  - File: `src/renderer/components/InterrogationFlow.tsx`

- [ ] **T040** [P] ConclusionView component
  - Consistency score gauge
  - Contradictions list
  - Remaining gaps list
  - Final summary (markdown rendering)
  - File: `src/renderer/components/ConclusionView.tsx`

### State Management

- [ ] **T041** Zustand store for interrogation state
  - Store: `useInterrogationStore` with Immer
  - State: `activeSession`, `isRunning`, `currentIteration`, `qaPairs`
  - Actions: `startSession()`, `stopSession()`, `addQAPair()`, `updateStatus()`
  - IPC event subscriptions (onProgress)
  - File: `src/renderer/store/interrogationStore.ts`

---

## Phase 3.4: Integration & Wiring

- [ ] **T042** Wire React App.tsx with components and store
  - Layout: StrategyInput (top), InterrogationFlow (left), ConclusionView (right)
  - Connect to Zustand store
  - Connection status indicators
  - File: `src/renderer/App.tsx`

- [ ] **T043** Electron main process entry point
  - Create BrowserWindow
  - Load preload script
  - IPC handler registration
  - App lifecycle management
  - File: `src/main/index.ts`

- [ ] **T044** Session history modal component
  - List all sessions via IPC
  - Load session on click (read-only view)
  - Accessible via menu
  - File: `src/renderer/components/SessionHistoryModal.tsx`

---

## Phase 3.5: Polish & Validation

- [ ] **T045** [P] Unit tests for validation logic
  - Test Configuration validation (timeout ranges, provider constraints)
  - Test Session validation (iteration limits, status transitions)
  - File: `tests/unit/validation/config-validation.test.ts`, `tests/unit/validation/session-validation.test.ts`

- [ ] **T046** [P] Performance validation
  - Verify interrogation iteration < 2s (mock LLM APIs for speed)
  - Verify UI response < 500ms
  - File: `tests/unit/performance/iteration-timing.test.ts`

- [ ] **T047** Run quickstart.md manual testing
  - Execute complete quickstart scenario from [quickstart.md](./quickstart.md)
  - Validate all steps pass
  - Document any deviations

- [ ] **T048** [P] Update README.md with setup instructions
  - Prerequisites (VS 2022, Node.js, Ollama)
  - Installation steps
  - Configuration guide
  - Link to SETUP.md and CONTRIBUTING.md
  - File: `README.md`

- [ ] **T049** Code cleanup and refactoring
  - Remove duplication
  - Add JSDoc comments to public APIs
  - Verify ESLint/Prettier compliance
  - Files: All source files

- [ ] **T050** Final constitution compliance check
  - Review code against [constitution.md](../../../.specify/memory/constitution.md)
  - Verify 60% test coverage for agents/ and api/
  - Verify no API keys in Git
  - Verify error handling in all API calls

---

## Dependencies

### Blocking Dependencies
- **T001-T005** (Setup) must complete before ANY other tasks
- **T006-T020** (Tests) must complete and FAIL before T021-T044 (Implementation)
- **T021-T026** (Models) must complete before services/agents that use them (T027-T035)
- **T027** (ConfigManager) must complete before T029-T032 (API clients need config)
- **T028** (SessionManager) must complete before T036 (Orchestrator needs persistence)
- **T029-T032** (API clients) must complete before T033-T035 (Agents use clients)
- **T033-T035** (Agents) must complete before T036 (Orchestrator uses agents)
- **T036-T037** (Main process) must complete before T041-T044 (Renderer needs IPC)
- **T041** (Zustand store) must complete before T038-T040, T042 (Components use store)
- **T021-T044** (All implementation) must complete before T045-T050 (Polish)

### Parallel Groups
**Setup** (can run in parallel after T001-T002):
- T003, T004, T005

**Contract Tests** (can run in parallel):
- T006, T007, T008, T009, T010, T011, T012

**Agent Interface Tests** (can run in parallel):
- T013, T014, T015

**Integration Tests** (can run in parallel):
- T016, T017, T018, T019, T020

**Models** (can run in parallel):
- T021, T022, T023, T024, T025, T026

**API Clients** (can run in parallel after T027):
- T029, T030, T031, T032

**UI Components** (can run in parallel after T041):
- T038, T038a, T039, T040

**Polish** (can run in parallel):
- T045, T046, T048

---

## Parallel Execution Example

### Launch all contract tests together:
```bash
# After T001-T005 complete and fail
Task: "Contract test POST /interrogation/start in tests/unit/api/interrogation-start.test.ts"
Task: "Contract test POST /interrogation/stop in tests/unit/api/interrogation-stop.test.ts"
Task: "Contract test GET /interrogation/status in tests/unit/api/interrogation-status.test.ts"
Task: "Contract test GET /sessions in tests/unit/api/session-list.test.ts"
Task: "Contract test GET /sessions/{id} in tests/unit/api/session-load.test.ts"
Task: "Contract test PUT /config/credentials in tests/unit/api/config-credentials.test.ts"
Task: "Contract test PUT /config/timeouts in tests/unit/api/config-timeouts.test.ts"
```

### Launch all model creation tasks together:
```bash
# After all tests are written and failing
Task: "Create Hypothesis model in src/models/Hypothesis.ts"
Task: "Create InterrogationSession model in src/models/InterrogationSession.ts"
Task: "Create QuestionAnswerPair model in src/models/QuestionAnswerPair.ts"
Task: "Create GapAnalysis model in src/models/GapAnalysis.ts"
Task: "Create AuditResult model in src/models/AuditResult.ts"
Task: "Create Configuration model in src/models/Configuration.ts"
```

---

## Notes

- **[P] tasks** = different files, no dependencies → safe to parallelize
- **Verify tests fail** before implementing (TDD discipline)
- **Commit after each task** for clean git history
- **Avoid**: Vague tasks, same file conflicts, skipping tests
- **Constitution compliance**: 60% test coverage for `agents/` and `api/` (enforced in T050)

---

## Validation Checklist
*Applied during task generation*

- [x] All contracts have corresponding tests (T006-T012)
- [x] All entities have model tasks (T021-T026)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks truly independent (verified file paths)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Quickstart scenario covered (T047)
- [x] Performance goals addressed (T046)
- [x] Constitution compliance validated (T050)

---

**Total Tasks**: 51
**Estimated Parallel Tasks**: 30 (marked with [P])
**Sequential Tasks**: 21 (dependencies enforced)

Ready for execution via `/implement` or manual task-by-task development.
