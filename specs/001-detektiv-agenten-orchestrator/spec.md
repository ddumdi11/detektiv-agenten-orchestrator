# Feature Specification: Detektiv-Agenten-Orchestrator MVP

**Feature Branch**: `001-detektiv-agenten-orchestrator`
**Created**: 2025-10-05
**Status**: Draft
**Input**: User description: "Detektiv-Agenten-Orchestrator MVP"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: MVP for Detective Agent Orchestrator desktop application
2. Extract key concepts from description
   → Actors: Users submitting hypotheses/questions, Detective Agent (Cloud LLM), Witness Agent (Local LLM)
   → Actions: Input hypothesis, interrogate witness, analyze gaps, generate report
   → Data: Hypotheses, questions, answers, consistency scores, audit results
   → Constraints: Must work with at least one Cloud LLM and Ollama
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: What happens when API rate limits are hit?]
   → [NEEDS CLARIFICATION: Should interrogation sessions be saveable/resumable?]
   → [NEEDS CLARIFICATION: Max number of interrogation iterations if witness keeps giving incomplete answers?]
4. Fill User Scenarios & Testing section
   → Primary flow: User inputs hypothesis → system interrogates → displays results
5. Generate Functional Requirements
   → All requirements testable and measurable
6. Identify Key Entities (if data involved)
   → Hypothesis, Question, Answer, AuditResult, Configuration
7. Run Review Checklist
   → WARN "Spec has uncertainties" (clarifications needed)
8. Return: SUCCESS (spec ready for planning after clarifications)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-05
- Q: Maximale Anzahl der Verhör-Iterationen - Wenn der Zeuge nach mehreren Fragen immer noch unvollständige Antworten liefert, wie soll das System reagieren? → A: Konfigurierbares Limit (User wählt 5-20 Iterationen vor Start)
- Q: Session-Speicherung - Sollen Benutzer vergangene Verhör-Sessions speichern und später wieder aufrufen können? → A: Ja - Sessions automatisch speichern und Liste aller Sessions anzeigen zum Laden (über Menüpunkt, nicht als Haupt-UI)
- Q: API Rate Limiting - Wenn eine Cloud-API ein Rate Limit erreicht, wie soll das System reagieren? → A: Automatisch zum nächsten konfigurierten Cloud-Provider wechseln (Fallback) mit Dokumentation des Wechsels im Session-Audit-Trail
- Q: Gleichzeitige Sessions - Soll ein Benutzer mehrere Verhör-Sessions parallel laufen lassen können? → A: Nur eine aktive Session - Start-Button deaktiviert während Verhör läuft
- Q: API-Timeouts - Wie lange soll das System auf eine Antwort warten, bevor ein Timeout eintritt? → A: Konfigurierbarer Timeout in Settings - Cloud-APIs: 15-120 Sekunden, Lokale LLMs: 15-360 Sekunden

---

## User Scenarios & Testing

### Primary User Story

A user wants to get comprehensive, detailed answers from a local AI model that tends to give incomplete responses. They input a hypothesis or question into the Detective Agent Orchestrator application. The system uses a powerful cloud-based AI (the "detective") to systematically interrogate a local AI model (the "witness") by asking follow-up questions whenever gaps or inconsistencies are detected. The interrogation continues until the detective determines the answer is complete and consistent. Finally, the user receives a comprehensive report with the complete information, consistency score, and any identified contradictions or gaps.

### Acceptance Scenarios

1. **Given** the user has the application open and API credentials configured, **When** they enter the hypothesis "Summarize the health benefits of Vitamin B3" and start the interrogation, **Then** the system displays a live interrogation flow showing questions from the detective to the witness, answers from the witness, and continues until the detective determines the answer is complete.

2. **Given** an interrogation is running, **When** the witness provides an incomplete answer (e.g., missing dosage information), **Then** the detective automatically detects the gap and asks a follow-up question to fill that gap.

3. **Given** an interrogation has completed, **When** the user views the results, **Then** they see a consistency score (0-100), a list of all question-answer pairs, identified contradictions (if any), and a final comprehensive summary.

4. **Given** the user has not configured API credentials, **When** they try to start an interrogation, **Then** the system displays an error message indicating which API credentials are missing and prevents the interrogation from starting.

5. **Given** an API connection fails during interrogation, **When** the error occurs, **Then** the system displays a clear error notification, shows connection status as failed, and provides a retry option.

### Edge Cases

- What happens when the configured iteration limit is reached but witness still provides incomplete information? System stops and presents current results with indication that limit was reached.
- How does the system handle extremely long responses from the witness that might exceed context windows?
- What happens if the user closes the application while an interrogation is running? Progress is lost for incomplete sessions; only completed sessions are saved.
- What if the local witness model is not running or unreachable?
- What if both detective and witness give contradictory answers across iterations?

---

## Requirements

### Functional Requirements

**Hypothesis Input & Configuration**
- **FR-001**: Users MUST be able to enter a hypothesis or question as text input
- **FR-002**: Users MUST be able to configure API credentials for at least one cloud LLM service (detective)
- **FR-003**: Users MUST be able to configure connection settings for local LLM service (witness)
- **FR-004**: Users MUST be able to select which specific models to use for detective and witness roles
- **FR-005**: System MUST validate API credentials before allowing interrogation to start
- **FR-006**: System MUST validate local LLM connectivity before starting interrogation

**Interrogation Process**
- **FR-007**: System MUST conduct iterative interrogation where detective asks questions and witness provides answers
- **FR-008**: System MUST analyze each witness answer for gaps, missing information, or ambiguities
- **FR-009**: System MUST generate follow-up questions when gaps are detected
- **FR-010**: System MUST continue interrogation until detective determines answer is complete OR user-configured iteration limit (5-20) is reached
- **FR-010a**: Users MUST be able to configure maximum iteration limit before starting interrogation (range: 5-20 iterations)
- **FR-010b**: System MUST stop interrogation and present current results when configured iteration limit is reached
- **FR-011**: System MUST display interrogation progress in real-time to the user
- **FR-012**: System MUST show each question-answer pair as it occurs during the interrogation

**Analysis & Results**
- **FR-013**: System MUST generate a consistency score (0-100) for the final interrogation results
- **FR-014**: System MUST identify and list any contradictions found between witness answers
- **FR-015**: System MUST identify and list any remaining gaps or missing information
- **FR-016**: System MUST provide a final comprehensive summary based on all collected information
- **FR-017**: Users MUST be able to view the complete interrogation flow (all questions and answers)
- **FR-018**: Users MUST be able to view the final audit results including consistency score and issues

**Session Management**
- **FR-019**: Users MUST be able to start a new interrogation session
- **FR-020**: Users MUST be able to stop an ongoing interrogation
- **FR-021**: System MUST automatically save completed interrogation sessions with all data (hypothesis, Q&A pairs, audit results)
- **FR-022**: Users MUST be able to access a list of all saved sessions via menu
- **FR-023**: Users MUST be able to load and view any previously saved session
- **FR-024**: System MUST display loaded sessions in read-only mode showing complete interrogation flow and results

**Error Handling & Feedback**
- **FR-025**: System MUST display clear error messages when API connections fail
- **FR-026**: System MUST show visual connection status indicators for detective and witness services
- **FR-027**: System MUST provide retry capability when API calls fail
- **FR-028**: System MUST automatically switch to next configured cloud provider when rate limit is encountered
- **FR-028a**: System MUST document provider switches in session audit trail with timestamp and reason
- **FR-028b**: System MUST allow users to configure fallback order for cloud providers
- **FR-028c**: System MUST display notification when provider switch occurs during interrogation
- **FR-029**: System MUST allow only one active interrogation session at a time
- **FR-029a**: System MUST disable start button while an interrogation is running
- **FR-029b**: System MUST enable start button only when no interrogation is active

**Configuration Management**
- **FR-030**: System MUST persist API credentials securely between sessions
- **FR-031**: System MUST persist model selection preferences
- **FR-032**: System MUST allow users to update API credentials and connection settings
- **FR-033**: System MUST [NEEDS CLARIFICATION: Should interrogation strategy templates be supported in MVP? If yes, users must be able to select predefined interrogation strategies]

**Performance & Limits**
- **FR-034**: Users MUST be able to configure timeout duration for cloud LLM API calls (range: 15-120 seconds)
- **FR-035**: Users MUST be able to configure timeout duration for local LLM API calls (range: 15-360 seconds)
- **FR-036**: System MUST display timeout error and offer retry when configured timeout is exceeded
- **FR-037**: System MUST [NEEDS CLARIFICATION: Should there be limits on hypothesis input length? If yes, what is the maximum?]

### Key Entities

- **Hypothesis**: The initial question or statement provided by the user that drives the interrogation process
  - Attributes: text content, timestamp created
  - Relationships: triggers one InterrogationSession

- **InterrogationSession**: A complete cycle of detective-witness questioning about a specific hypothesis
  - Attributes: unique identifier, start time, end time, status (running/completed/failed/limit-reached), hypothesis reference, configured iteration limit, audit trail (provider switches)
  - Relationships: contains multiple QuestionAnswerPairs, produces one AuditResult

- **QuestionAnswerPair**: A single exchange between detective and witness
  - Attributes: sequence number, question text, answer text, timestamp, gap analysis results, detective provider used
  - Relationships: belongs to one InterrogationSession

- **AuditResult**: The final analysis of an interrogation session
  - Attributes: consistency score (0-100), list of contradictions, list of gaps, final summary text
  - Relationships: belongs to one InterrogationSession

- **Configuration**: User settings for API connections and preferences
  - Attributes: detective API credentials, witness connection settings, selected models, timeout settings (cloud: 15-120s, local: 15-360s), provider fallback order, iteration limit preference
  - Note: Must be stored securely for credentials

- **GapAnalysis**: Detective's assessment of a witness answer's completeness and consistency
  - Attributes: array of identified gaps (with category, description, severity), completeness score (0-100), requiresFollowUp flag
  - Gap categories: missing_information, ambiguity, inconsistency, vagueness
  - Relationships: embedded in each QuestionAnswerPair, drives follow-up question generation
  - Note: If requiresFollowUp is true, detective generates next question; if false, interrogation can conclude

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (7 clarifications needed)
- [x] Requirements are testable and unambiguous (except those marked for clarification)
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (MVP features only)
- [x] Dependencies and assumptions identified

**Clarifications Needed:**
1. Max iteration limit and behavior when limit is reached
2. Session save/resume functionality requirements
3. API rate limit handling strategy
4. Multiple simultaneous session support
5. Performance targets (response times, timeouts)
6. Input length limits
7. Interrogation strategy template support in MVP

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (pending clarifications)

---
