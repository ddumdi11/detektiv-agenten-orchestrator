# Quickstart: Detective Agent Orchestrator MVP

**Date**: 2025-10-05
**Feature**: [spec.md](./spec.md)

## Purpose

This quickstart validates the primary user story (spec lines 54-56) and acceptance scenarios. It serves as an **integration test scenario** to be executed manually or automated with E2E tests.

---

## Prerequisites

### 1. Development Environment

- **Windows 10+** with development tools installed (see [SETUP.md](../../../SETUP.md))
- **Visual Studio 2022** with C++ workload
- **Node.js 18.x LTS**
- **Ollama** running locally on `http://127.0.0.1:11434`

### 2. Ollama Setup

```bash
# Install Ollama (if not already installed)
# Download from https://ollama.ai/

# Pull a test model
ollama pull llama2

# Verify Ollama is running
curl http://127.0.0.1:11434/api/tags
# Should return JSON list of models
```

### 3. OpenAI API Key

- Obtain API key from https://platform.openai.com/api-keys
- Have key ready for configuration step

---

## Scenario: Complete Interrogation Flow

### Given: User opens app with configured API credentials

**Step 1**: Install and launch application

```bash
# From repository root
cd Detektiv-Agenten-Orchestrator

# Install dependencies
npm install

# Start application in development mode
npm run dev
```

**Expected**: Electron window opens showing main UI

**Step 2**: Configure API credentials (first run only)

1. Click **"Settings"** button (or menu item)
2. In **Detective Configuration** section:
   - Provider: Select **"OpenAI"**
   - API Key: Paste your OpenAI API key
   - Model: Select **"gpt-4o"** (or "gpt-4o-mini" for lower cost)
   - Click **"Validate Credentials"**

   **Expected**: Green checkmark appears, message "Credentials valid"

3. In **Witness Configuration** section:
   - Base URL: Verify shows `http://127.0.0.1:11434`
   - Model: Select **"llama2"** from dropdown
   - Click **"Test Connection"**

   **Expected**: Green checkmark appears, message "Ollama reachable"

4. In **Preferences** section:
   - Default Iteration Limit: Set to **10**
   - Cloud Timeout: **60** seconds
   - Local Timeout: **120** seconds

5. Click **"Save Configuration"**

**Expected**: Settings saved, modal closes, returns to main screen

---

### When: User enters hypothesis and starts interrogation

**Step 3**: Enter hypothesis

1. In main window, locate **"Hypothesis Input"** textarea
2. Type or paste:
   ```
   Summarize the health benefits of Vitamin B3
   ```
3. Verify **Iteration Limit** slider shows **10** (from saved preference)
4. **Detective Provider** shows **"OpenAI (gpt-4o)"**
5. **Witness Model** shows **"Ollama (llama2)"**

**Expected**: All fields populated correctly

**Step 4**: Start interrogation

1. Click **"Start Interrogation"** button

**Expected**:
- Button becomes disabled (FR-029a)
- Button text changes to "Interrogation Running..."
- **"Stop Interrogation"** button appears
- **Connection Status Indicators** show:
  - Detective: 🟢 Connected
  - Witness: 🟢 Connected

---

### Then: System displays live Q&A pairs

**Step 5**: Observe real-time interrogation flow

**Expected Behavior**:

1. **Interrogation Flow Panel** (left side) updates in real-time
2. **First iteration** appears:
   ```
   Q1: [Detective's first question to witness]
      ↳ From: OpenAI (gpt-4o)

   A1: [Witness's response]
      ↳ From: Ollama (llama2)
      ✓ Completeness: 65% (example)
      ⚠ Gaps detected: 2
   ```

3. **Iteration counter** updates: "Iteration 1 / 10"

4. **Subsequent iterations** appear automatically as detective detects gaps:
   ```
   Q2: [Follow-up question about detected gap]
   A2: [More detailed witness response]
   ```

5. **Progress bar** shows visual progress toward iteration limit

**Validation Points**:
- Each Q&A pair appears within **2 seconds** of previous (performance goal)
- **Timestamps** are visible for each exchange
- **Gap indicators** show missing information categories
- **Provider labels** correctly identify which LLM answered

---

### And: Detective asks follow-up questions when gaps detected

**Step 6**: Verify gap detection logic

**Expected Pattern**:

1. If witness gives incomplete answer (e.g., missing dosage information):
   ```
   A3: "Vitamin B3 helps with energy metabolism."

   ⚠ Gap Analysis:
   - Missing: Recommended dosage amounts
   - Missing: Food sources
   - Severity: Medium
   ```

2. Next question targets the gap:
   ```
   Q4: "What are the recommended daily dosage amounts and food sources for Vitamin B3?"
   ```

**Validation**:
- Detective **does not repeat** already-answered questions
- Follow-ups are **contextually relevant** to gaps
- If answer is complete (no gaps), detective may end early (before iteration 10)

---

### And: Interrogation completes when detective satisfied OR limit reached

**Step 7**: Wait for completion

**Completion Trigger 1**: Detective Satisfied
```
A7: [Comprehensive answer with all details]

✓ Gap Analysis: No gaps detected (Completeness: 95%)

[Interrogation ends at iteration 7/10]
Status: Completed ✓
```

**OR**

**Completion Trigger 2**: Limit Reached
```
[10 iterations complete, some gaps remain]

Status: Limit Reached ⚠
```

**Expected**:
- **"Start Interrogation"** button re-enables (FR-029b)
- **Interrogation Flow Panel** stops updating
- **Audit Results Panel** (right side) populates

---

### And: User sees consistency score, contradictions list, final summary

**Step 8**: Review audit results

**Expected Audit Results Panel** shows:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       AUDIT RESULT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Consistency Score: 87 / 100
  ████████████████████░░░░░  87%

✓ Contradictions: 0 found

⚠ Remaining Gaps: 1
  • Food sources not fully detailed (Low severity)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vitamin B3 (Niacin) provides several key health
benefits:

1. **Energy Metabolism**: Essential for converting
   carbohydrates, fats, and proteins into usable
   energy (ATP production).

2. **Cardiovascular Health**: Helps lower LDL
   cholesterol and raise HDL cholesterol levels.

3. **Recommended Dosage**:
   - Adult men: 16 mg/day
   - Adult women: 14 mg/day
   - Upper limit: 35 mg/day (from supplements)

4. **Food Sources**: Chicken, turkey, salmon,
   fortified cereals, peanuts.

5. **Additional Benefits**: Supports skin health,
   brain function, and DNA repair.

[Full markdown-formatted summary continues...]
```

**Validation Points**:
- **Consistency Score**: Number between 0-100
- **Contradictions**: List with references to specific Q&A pairs (or empty if none)
- **Remaining Gaps**: Categorized list (or empty if complete)
- **Summary**: Multi-paragraph markdown text synthesizing all information

---

### And: Session is automatically saved

**Step 9**: Verify session persistence

1. Click **"Menu"** → **"View Session History"**

**Expected**:
- Modal opens showing **Session History** table
- **Most recent session** appears at top:
  ```
  ID: session_001_20251005_143022
  Hypothesis: "Summarize the health benefits..."
  Started: 2025-10-05 14:30:22
  Status: Completed ✓
  Score: 87%
  ```

2. Click on the session row

**Expected**:
- Modal opens showing **read-only view** of complete interrogation (FR-024)
- All Q&A pairs visible
- Audit result displayed
- **"Export"** button available (for future Phase 2)

**File System Verification** (manual check):

```bash
# On Windows
cd %APPDATA%\detective-orchestrator\sessions

# List session files
dir

# Should show:
# session_001_20251005_143022.json
# index.json
```

**JSON validation**:
```bash
# Read session file
type session_001_20251005_143022.json

# Verify structure matches data-model.md schema
```

---

## Success Criteria

✅ **All acceptance scenarios passed**:
1. ✅ Credentials validated before interrogation
2. ✅ Real-time Q&A display during interrogation
3. ✅ Gap detection triggers follow-up questions
4. ✅ Interrogation completes (satisfied or limit)
5. ✅ Audit results displayed with score, contradictions, gaps, summary
6. ✅ Session automatically saved
7. ✅ Session loadable from history

✅ **Performance met**:
- Each iteration completes in < 2 seconds (depends on LLM speed)
- UI remains responsive throughout
- No freezing or blocking

✅ **Error handling tested**:
- If Ollama offline: Error shown, interrogation prevented (FR-006)
- If invalid API key: Error shown, credentials rejected (FR-005)
- If timeout occurs: Retry offered (FR-036)

---

## Troubleshooting

### Issue: "Ollama not reachable"

**Solution**:
```bash
# Check if Ollama is running
ollama list

# If not running, start Ollama
ollama serve

# Verify endpoint
curl http://127.0.0.1:11434/api/tags
```

### Issue: "OpenAI rate limit exceeded"

**Symptom**: Toast notification "Switching to fallback provider..."

**Expected Behavior** (if Phase 2 multi-provider configured):
- System automatically switches to Anthropic or Gemini
- Audit trail logs the switch
- Interrogation continues

**MVP Behavior** (only OpenAI configured):
- Error displayed
- Interrogation paused
- Retry button offered

### Issue: Session not saving

**Check**:
```bash
# Verify app data directory exists
dir %APPDATA%\detective-orchestrator

# Check permissions
# User should have write access
```

---

## Next Steps

After quickstart validation:

1. **Run automated E2E tests**: `npm run test:e2e`
2. **Check test coverage**: `npm run test:coverage`
3. **Validate constitution compliance**: Review code against [constitution.md](../../../.specify/memory/constitution.md)
4. **Proceed to Phase 2 features**: Multi-provider support, advanced visualizations

---

**Quickstart Complete!** 🎉

This validates the MVP core functionality as specified in [spec.md](./spec.md).
