# Data Model: Detektiv-Agenten-Orchestrator MVP

**Date**: 2025-10-05
**Feature**: [spec.md](./spec.md)

## Entity Relationship Diagram

```
┌─────────────┐
│  Hypothesis │
└──────┬──────┘
       │ 1
       │ triggers
       │
       ↓ 1
┌──────────────────────┐
│ InterrogationSession │
└──────┬───────────────┘
       │ 1
       │ contains
       │
       ↓ N
┌──────────────────────┐
│  QuestionAnswerPair  │
└──────┬───────────────┘
       │ 1
       │ has
       │
       ↓ 1
┌─────────────┐
│ GapAnalysis │
└─────────────┘

┌──────────────────────┐
│ InterrogationSession │
└──────┬───────────────┘
       │ 1
       │ produces
       │
       ↓ 1
┌─────────────┐
│ AuditResult │
└─────────────┘

┌───────────────┐
│ Configuration │  (singleton - app settings)
└───────────────┘
```

---

## Core Entities

### 1. Hypothesis

**Purpose**: The initial question or statement that drives the interrogation.

**TypeScript Interface**:
```typescript
interface Hypothesis {
  text: string;            // The actual question/statement
  createdAt: Date;         // ISO 8601 timestamp
}
```

**Validation Rules**:
- `text`: Required, non-empty string
- `text.length`: Deferred to implementation (FR-037 - low impact)
- `createdAt`: Must be valid ISO 8601 date-time

**Example**:
```json
{
  "text": "Summarize the health benefits of Vitamin B3",
  "createdAt": "2025-10-05T14:30:22Z"
}
```

---

### 2. InterrogationSession

**Purpose**: Represents a complete detective-witness interrogation cycle.

**TypeScript Interface**:
```typescript
type SessionStatus = 'running' | 'completed' | 'failed' | 'limit-reached';

interface AuditTrailEntry {
  timestamp: Date;
  event: 'provider_switch' | 'timeout' | 'error';
  fromProvider?: string;    // Only for provider_switch
  toProvider?: string;      // Only for provider_switch
  reason: string;
}

interface InterrogationSession {
  id: string;                          // UUID v4
  hypothesis: Hypothesis;              // Embedded hypothesis
  startTime: Date;                     // ISO 8601
  endTime?: Date;                      // ISO 8601, undefined while running
  status: SessionStatus;
  iterationLimit: number;              // User-configured (5-20)
  currentIteration: number;            // Current iteration count
  qaPairs: QuestionAnswerPair[];       // Array of Q&A exchanges
  auditResult?: AuditResult;           // Only set when status = completed
  auditTrail: AuditTrailEntry[];       // Provider switches, errors
}
```

**Validation Rules**:
- `id`: Must be valid UUID v4
- `startTime`: Must be <= `endTime` (if endTime exists)
- `status`: Must be one of the enum values
- `iterationLimit`: Integer in range [5, 20] (from FR-010a)
- `currentIteration`: Integer >= 0, <= `iterationLimit`
- `qaPairs.length`: Should equal `currentIteration`
- `auditResult`: Required if `status === 'completed'`, otherwise undefined
- `auditTrail`: Can be empty array

**State Transitions**:
```
[Create Session]
      ↓
  'running' ──timeout/error──→ 'failed'
      │
      ├──limit reached──→ 'limit-reached'
      │
      └──detective satisfied──→ 'completed'
```

**Persistence**: Saved to `sessions/session_{id}_{timestamp}.json`

---

### 3. QuestionAnswerPair

**Purpose**: A single detective question + witness answer exchange.

**TypeScript Interface**:
```typescript
interface QuestionAnswerPair {
  sequence: number;              // 1-indexed iteration number
  question: string;              // Detective's question
  answer: string;                // Witness's response
  timestamp: Date;               // ISO 8601
  gapAnalysis: GapAnalysis;      // Detective's analysis of this answer
  providerUsed: string;          // e.g., "openai:gpt-4o", "anthropic:claude-sonnet-4"
}
```

**Validation Rules**:
- `sequence`: Positive integer, must match position in `qaPairs` array + 1
- `question`: Required, non-empty string
- `answer`: Required (can be empty if witness returned empty)
- `timestamp`: Valid ISO 8601, must be >= session.startTime
- `gapAnalysis`: Required, must be valid GapAnalysis object
- `providerUsed`: Format `"{provider}:{model}"` (e.g., `"openai:gpt-4o"`)

**Example**:
```json
{
  "sequence": 3,
  "question": "What are the specific dosage recommendations for Vitamin B3?",
  "answer": "The recommended daily allowance is 16mg for adult men...",
  "timestamp": "2025-10-05T14:32:15Z",
  "gapAnalysis": { /* see GapAnalysis below */ },
  "providerUsed": "openai:gpt-4o"
}
```

---

### 4. GapAnalysis

**Purpose**: Detective's assessment of completeness/consistency of a witness answer.

**TypeScript Interface**:
```typescript
interface Gap {
  category: 'missing_information' | 'ambiguity' | 'inconsistency' | 'vagueness';
  description: string;        // What's missing/unclear
  severity: 'low' | 'medium' | 'high';
}

interface GapAnalysis {
  gaps: Gap[];                 // Array of identified gaps
  completenessScore: number;   // 0-100, higher = more complete
  requiresFollowUp: boolean;   // true if detective should ask another question
}
```

**Validation Rules**:
- `gaps`: Can be empty array (indicates complete answer)
- `gaps[].category`: Must be one of the enum values
- `gaps[].description`: Required, non-empty string
- `gaps[].severity`: Must be one of enum values
- `completenessScore`: Integer in range [0, 100]
- `requiresFollowUp`: Boolean
  - If `true`: Expect another QuestionAnswerPair to follow
  - If `false`: Interrogation can end (detective satisfied)

**Gap Determination Logic** (Detective Agent):
```typescript
function analyzeGaps(answer: string, context: SessionContext): GapAnalysis {
  // Detective LLM prompt:
  // "Analyze this answer for gaps. List missing facts, ambiguities, inconsistencies."

  // Returns structured response parsed into GapAnalysis
}
```

---

### 5. AuditResult

**Purpose**: Final analysis of an interrogation session.

**TypeScript Interface**:
```typescript
interface Contradiction {
  qaPairIndexes: [number, number];  // Indexes of conflicting QA pairs
  description: string;               // What contradicts what
}

interface RemainingGap {
  category: string;                  // From final GapAnalysis
  description: string;
}

interface AuditResult {
  consistencyScore: number;          // 0-100, higher = more consistent
  contradictions: Contradiction[];   // Array of found contradictions
  remainingGaps: RemainingGap[];     // Gaps still present at end
  summary: string;                   // Comprehensive final summary (markdown)
}
```

**Validation Rules** (from FR-013 to FR-016):
- `consistencyScore`: Integer in range [0, 100]
- `contradictions`: Can be empty array
  - `qaPairIndexes`: Both indexes must be valid (< qaPairs.length)
  - `description`: Required, non-empty string
- `remainingGaps`: Can be empty array (ideal outcome)
  - Derived from final QuestionAnswerPair's gapAnalysis
- `summary`: Required, non-empty string
  - Generated by detective LLM synthesizing all Q&A pairs

**Scoring Logic** (AnalysisEngine):
```typescript
function calculateConsistencyScore(session: InterrogationSession): number {
  // Factors:
  // - Number of contradictions (each -10 points)
  // - Number of remaining gaps (weighted by severity)
  // - Overall completeness scores from GapAnalyses

  const baseScore = 100;
  const contradictionPenalty = session.contradictions.length * 10;
  const gapPenalty = calculateGapPenalty(session.qaPairs);

  return Math.max(0, baseScore - contradictionPenalty - gapPenalty);
}
```

---

### 6. Configuration

**Purpose**: User settings for API connections, preferences, timeouts.

**TypeScript Interface**:
```typescript
interface ProviderCredential {
  provider: 'openai' | 'anthropic' | 'gemini';
  apiKey: string;               // Encrypted by electron-store
  model: string;                // e.g., "gpt-4o", "claude-sonnet-4"
  isDefault: boolean;           // For detective role
}

interface TimeoutSettings {
  cloudTimeout: number;         // Seconds, range [15, 120]
  localTimeout: number;         // Seconds, range [15, 360]
}

interface Configuration {
  detectives: ProviderCredential[];      // Cloud LLM providers
  witness: {
    baseUrl: string;                     // Default: "http://127.0.0.1:11434"
    model: string;                       // e.g., "llama2"
  };
  providerFallbackOrder: string[];       // Array of provider names
  timeouts: TimeoutSettings;
  defaultIterationLimit: number;         // User's preferred default [5, 20]
}
```

**Validation Rules** (from FR-030 to FR-035):
- `detectives`: At least 1 entry required (MVP: just OpenAI)
- `detectives[].apiKey`: Required, min length 20 (basic sanity check)
- `detectives[].isDefault`: Exactly one must be `true`
- `witness.baseUrl`: Must be valid URL
- `providerFallbackOrder`: Must contain all detective provider names
- `timeouts.cloudTimeout`: Integer in [15, 120]
- `timeouts.localTimeout`: Integer in [15, 360]
- `defaultIterationLimit`: Integer in [5, 20]

**Storage**: Encrypted via electron-store at `%APPDATA%/detective-orchestrator/config.json`

---

## Derived Data Structures

### SessionListItem (for session browser)

**Purpose**: Lightweight representation for session history UI.

```typescript
interface SessionListItem {
  id: string;
  hypothesis: string;          // Just the text
  startTime: Date;
  status: SessionStatus;
  consistencyScore?: number;   // From auditResult if completed
}
```

**Source**: Generated from session files in `sessions/` directory by reading only metadata.

---

## Persistence Schemas

### JSON Schema for InterrogationSession

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "hypothesis", "startTime", "status", "iterationLimit", "currentIteration", "qaPairs", "auditTrail"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "hypothesis": {
      "type": "object",
      "required": ["text", "createdAt"],
      "properties": {
        "text": { "type": "string", "minLength": 1 },
        "createdAt": { "type": "string", "format": "date-time" }
      }
    },
    "startTime": { "type": "string", "format": "date-time" },
    "endTime": { "type": "string", "format": "date-time" },
    "status": { "enum": ["running", "completed", "failed", "limit-reached"] },
    "iterationLimit": { "type": "integer", "minimum": 5, "maximum": 20 },
    "currentIteration": { "type": "integer", "minimum": 0 },
    "qaPairs": {
      "type": "array",
      "items": { "$ref": "#/definitions/QuestionAnswerPair" }
    },
    "auditResult": { "$ref": "#/definitions/AuditResult" },
    "auditTrail": {
      "type": "array",
      "items": { "$ref": "#/definitions/AuditTrailEntry" }
    }
  },
  "definitions": {
    "QuestionAnswerPair": { /* full schema */ },
    "AuditResult": { /* full schema */ },
    "AuditTrailEntry": { /* full schema */ }
  }
}
```

---

## Summary

**6 Core Entities** defined with:
- TypeScript interfaces
- Validation rules aligned with functional requirements
- State transitions (for InterrogationSession)
- Persistence strategies (JSON files + validation)
- Relationships clearly mapped

**Next Steps** (Phase 1 continuation):
- Generate API contracts from these entities
- Create failing contract tests
- Generate quickstart scenario
