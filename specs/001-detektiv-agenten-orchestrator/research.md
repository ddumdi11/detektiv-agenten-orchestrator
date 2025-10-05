# Research: Detektiv-Agenten-Orchestrator MVP

**Date**: 2025-10-05
**Feature**: [spec.md](./spec.md)

## 1. Electron + React + TypeScript Setup

### Decision: Electron Forge + Vite

**Rationale**:
- **Electron Forge** provides best-in-class tooling for Electron apps in 2025
- **Vite** offers fast HMR (Hot Module Replacement) for React development
- Official `@electron-forge/plugin-vite` integration
- TypeScript support out-of-the-box
- Simpler configuration than manual webpack setup

**Alternatives Considered**:
- **electron-builder + Create React App**: Deprecated CRA, more manual setup
- **electron-vite (standalone)**: Less integrated with Electron Forge ecosystem
- **Manual webpack**: More control but significantly more configuration overhead

**Implementation Notes**:
```bash
npm init electron-app@latest detective-orchestrator -- --template=vite-typescript
```

### IPC Security Patterns

**Decision**: Context Bridge + Preload Scripts

**Rationale**:
- **contextBridge** exposes only specific APIs to renderer (principle of least privilege)
- **Preload scripts** run in isolated context with access to both Node and DOM
- Prevents renderer from directly accessing Node.js APIs (security best practice)

**Pattern**:
```typescript
// preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  interrogation: {
    start: (params) => ipcRenderer.invoke('interrogation:start', params),
    stop: (sessionId) => ipcRenderer.invoke('interrogation:stop', sessionId),
    onProgress: (callback) => ipcRenderer.on('interrogation:progress', callback)
  }
});
```

### Encrypted Credential Storage

**Decision**: electron-store v8.x with encryption

**Rationale**:
- **Built-in encryption**: AES-256-GCM with system keychain integration
- **Cross-platform**: Works on Windows, macOS, Linux
- **Type-safe**: TypeScript support with schema validation
- **Atomic writes**: Prevents corruption during crashes

**Configuration**:
```typescript
import Store from 'electron-store';

const configStore = new Store({
  name: 'detective-config',
  encryptionKey: 'obfuscate',  // Uses system keychain
  schema: {
    apiKeys: {
      type: 'object',
      properties: {
        openai: { type: 'string' },
        anthropic: { type: 'string' },
        gemini: { type: 'string' }
      }
    }
  }
});
```

---

## 2. LLM API Integration Patterns

### Decision: Unified Provider Abstraction with Strategy Pattern

**Rationale**:
- **Single interface** for all cloud providers (OpenAI, Anthropic, Google)
- **Easy to extend** for Phase 2 multi-provider support
- **Testable**: Can mock entire provider layer
- **Failover-ready**: Provider interface makes fallback logic clean

**Interface Design**:
```typescript
interface LLMProvider {
  readonly name: string;
  readonly models: readonly string[];

  chat(messages: Message[], options?: ChatOptions): Promise<string>;
  validateCredentials(): Promise<boolean>;
  handleRateLimit(error: Error): boolean;  // true if rate limit detected
}

class OpenAIProvider implements LLMProvider { /* ... */ }
class AnthropicProvider implements LLMProvider { /* ... */ }
```

### Ollama Integration

**Decision**: Ollama REST API v1 (OpenAI-compatible endpoint)

**Rationale**:
- Ollama exposes OpenAI-compatible `/v1/chat/completions` endpoint
- Can reuse OpenAI client structure with different base URL
- Standard: http://127.0.0.1:11434/v1
- No authentication required (local-only)

**Implementation**:
```typescript
class OllamaClient implements LLMProvider {
  private baseURL = 'http://127.0.0.1:11434/v1';

  async chat(messages: Message[]): Promise<string> {
    const response = await axios.post(`${this.baseURL}/chat/completions`, {
      model: this.selectedModel,
      messages
    });
    return response.data.choices[0].message.content;
  }
}
```

### Rate Limit Detection Strategy

**Decision**: HTTP Status Code + Provider-Specific Headers

**Rationale**:
- **OpenAI**: Returns `429 Too Many Requests` + `Retry-After` header
- **Anthropic**: Returns `429` + `anthropic-ratelimit-*` headers
- **Gemini**: Returns `429` + `X-RateLimit-*` headers
- Each provider has slightly different headers but all use HTTP 429

**Detection Logic**:
```typescript
function isRateLimitError(error: AxiosError): boolean {
  if (error.response?.status !== 429) return false;

  const retryAfter = error.response.headers['retry-after'];
  const anthropicLimit = error.response.headers['anthropic-ratelimit-remaining'];
  const geminiLimit = error.response.headers['x-ratelimit-remaining'];

  return !!(retryAfter || anthropicLimit === '0' || geminiLimit === '0');
}
```

### Timeout Handling

**Decision**: AbortController with configurable timeouts per provider type

**Rationale**:
- **AbortController**: Standard Web API, works with Axios
- **Per-provider-type**: Cloud (15-120s) vs Local (15-360s) from spec clarifications
- **Clean cancellation**: No hanging requests

**Implementation**:
```typescript
async function callWithTimeout(
  provider: LLMProvider,
  messages: Message[],
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await provider.chat(messages, { signal: controller.signal });
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

## 3. Session Persistence

### Decision: JSON Files in Electron userData + JSON Schema Validation

**Rationale**:
- **userData directory**: Cross-platform app data location (`app.getPath('userData')`)
- **One file per session**: Easier to manage, load individual sessions
- **JSON Schema validation**: Prevents corrupted data from breaking app
- **Human-readable**: Users can inspect/debug session files if needed

**File Structure**:
```
~/AppData/Roaming/detective-orchestrator/  (Windows)
├── config.json                            # encrypted by electron-store
└── sessions/
    ├── session_001_20251005_143022.json
    ├── session_002_20251005_150311.json
    └── index.json                         # lightweight session list
```

**Schema Validation**:
```typescript
import Ajv from 'ajv';

const sessionSchema = {
  type: 'object',
  required: ['id', 'hypothesis', 'startTime', 'status'],
  properties: {
    id: { type: 'string' },
    hypothesis: { type: 'string' },
    startTime: { type: 'string', format: 'date-time' },
    endTime: { type: 'string', format: 'date-time' },
    status: { enum: ['running', 'completed', 'failed', 'limit-reached'] },
    iterationLimit: { type: 'number', minimum: 5, maximum: 20 },
    qaPairs: { type: 'array', items: { /* QuestionAnswerPair schema */ } },
    auditResult: { type: 'object', /* AuditResult schema */ },
    auditTrail: { type: 'array', items: { /* provider switch events */ } }
  }
};

const ajv = new Ajv();
const validateSession = ajv.compile(sessionSchema);
```

### Incremental Saving Strategy

**Decision**: Incremental append + atomic replace on completion

**Rationale**:
- **During interrogation**: Append new Q&A pairs incrementally (prevents data loss if crash)
- **On completion**: Atomic write of final session with audit result
- **Atomic writes**: Write to temp file, then rename (prevents corruption)

**Implementation**:
```typescript
async function saveSessionIncremental(sessionId: string, newQA: QuestionAnswerPair) {
  const sessionPath = getSessionPath(sessionId);
  const session = await loadSession(sessionId);
  session.qaPairs.push(newQA);

  // Atomic write pattern
  const tempPath = `${sessionPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(session, null, 2));
  await fs.rename(tempPath, sessionPath);  // Atomic on same filesystem
}
```

---

## 4. State Management

### Decision: Zustand with TypeScript

**Rationale**:
- **Simpler than Redux**: Less boilerplate for Electron renderer state
- **TypeScript-first**: Excellent type inference
- **React hooks integration**: `useStore()` pattern feels natural
- **Devtools support**: Redux DevTools integration available
- **Immer built-in**: Immutable state updates without manual spreading

**Alternatives Considered**:
- **Redux Toolkit**: More setup, overkill for MVP scope
- **Context API**: Doesn't scale well for complex async flows
- **Jotai/Recoil**: Less mature ecosystem, steeper learning curve

**Store Structure**:
```typescript
interface InterrogationState {
  activeSession: InterrogationSession | null;
  isRunning: boolean;
  currentIteration: number;
  qaPairs: QuestionAnswerPair[];

  // Actions
  startSession: (hypothesis: string, config: SessionConfig) => Promise<void>;
  stopSession: () => Promise<void>;
  addQAPair: (pair: QuestionAnswerPair) => void;
  updateStatus: (status: SessionStatus) => void;
}

const useInterrogationStore = create<InterrogationState>()(
  devtools(
    immer((set, get) => ({
      activeSession: null,
      isRunning: false,
      currentIteration: 0,
      qaPairs: [],

      startSession: async (hypothesis, config) => {
        set((state) => {
          state.isRunning = true;
          state.activeSession = createSession(hypothesis, config);
        });
        // IPC call to main process
        await window.electronAPI.interrogation.start(config);
      },

      addQAPair: (pair) => set((state) => {
        state.qaPairs.push(pair);
        state.currentIteration++;
      }),
      // ...
    }))
  )
);
```

### Real-Time UI Updates Pattern

**Decision**: IPC Event Streaming from Main to Renderer

**Rationale**:
- **Main process** handles LLM API calls (has Node.js access)
- **Renderer subscribes** to progress events via IPC
- **React hooks** update UI reactively from Zustand store

**Flow**:
```
Main Process (Interrogation Loop)
  ↓ IPC: 'interrogation:qa-pair'
Preload (Context Bridge)
  ↓ window.electronAPI.interrogation.onProgress()
Renderer (React Component)
  ↓ useEffect(() => subscribe())
Zustand Store
  ↓ addQAPair()
React Re-render
```

**Implementation**:
```typescript
// Renderer component
useEffect(() => {
  const unsubscribe = window.electronAPI.interrogation.onProgress((qaPair) => {
    useInterrogationStore.getState().addQAPair(qaPair);
  });

  return () => unsubscribe();
}, []);
```

### Long-Running Operations

**Decision**: Main Process Worker Pattern + Progress Streaming

**Rationale**:
- **Main process** runs interrogation loop (doesn't block UI)
- **Renderer** remains responsive (separate process)
- **Progress events** stream via IPC (real-time feedback)
- **Cancellation**: IPC message `interrogation:stop` aborts loop

---

## 5. Testing Strategy

### Jest + Electron Setup

**Decision**: @electron/test-utils + Jest 29

**Rationale**:
- **@electron/test-utils**: Official Electron testing utilities
- **Separate configs**: `jest.config.main.js` (Node) + `jest.config.renderer.js` (jsdom)
- **Coverage**: 60% minimum per constitution (agents/ and api/ focus)

**Configuration**:
```javascript
// jest.config.main.js (Main process tests)
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/main/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup-main.ts']
};

// jest.config.renderer.js (React component tests)
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/unit/renderer/**/*.test.ts'],
  setupFilesAfterEnv: ['@testing-library/jest-dom']
};
```

### Mocking LLM APIs

**Decision**: MSW (Mock Service Worker) + Test Fixtures

**Rationale**:
- **MSW**: Intercepts HTTP requests at network level (no code changes)
- **Realistic**: Tests actual Axios calls, not mocked functions
- **Test fixtures**: Pre-defined LLM responses for deterministic tests

**Example**:
```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('https://api.openai.com/v1/chat/completions', (req, res, ctx) => {
    return res(ctx.json({
      choices: [{ message: { content: 'Mocked detective question' } }]
    }));
  }),

  rest.post('http://127.0.0.1:11434/v1/chat/completions', (req, res, ctx) => {
    return res(ctx.json({
      choices: [{ message: { content: 'Mocked witness answer' } }]
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Playwright for E2E Testing

**Decision**: Playwright for Electron (Official Support)

**Rationale**:
- **Native Electron support**: `_electron.launch()` API
- **Cross-process**: Can test main + renderer interaction
- **Debugging**: Playwright Inspector works with Electron
- **Reliable**: Auto-wait, retry mechanisms

**Example**:
```typescript
import { _electron as electron } from 'playwright';

test('complete interrogation flow', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  // Fill hypothesis
  await window.fill('[data-testid="hypothesis-input"]', 'Test question');
  await window.selectOption('[data-testid="iteration-limit"]', '10');

  // Start interrogation
  await window.click('[data-testid="start-button"]');

  // Wait for completion
  await window.waitForSelector('[data-testid="audit-result"]', { timeout: 60000 });

  // Verify results
  const score = await window.textContent('[data-testid="consistency-score"]');
  expect(parseInt(score)).toBeGreaterThan(0);

  await app.close();
});
```

---

## Summary of Decisions

| Area | Decision | Key Benefit |
|------|----------|-------------|
| **Build Tool** | Electron Forge + Vite | Fast HMR, official support |
| **IPC Security** | Context Bridge + Preload | Least privilege principle |
| **Credentials** | electron-store v8 (encrypted) | AES-256-GCM, cross-platform |
| **LLM Abstraction** | Strategy pattern interface | Easy provider switching |
| **Ollama** | OpenAI-compatible endpoint | Code reuse |
| **Rate Limits** | HTTP 429 detection + fallback | Automatic provider switching |
| **Timeouts** | AbortController | Clean cancellation |
| **Persistence** | JSON files + validation | Human-readable, validated |
| **State** | Zustand + Immer | Simple, type-safe |
| **Real-time UI** | IPC event streaming | Reactive updates |
| **Unit Tests** | Jest + MSW | Network-level mocking |
| **E2E Tests** | Playwright for Electron | Native Electron support |

---

**All NEEDS CLARIFICATION items from Technical Context are now resolved.**
