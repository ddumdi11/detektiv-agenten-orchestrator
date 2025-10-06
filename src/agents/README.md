# Agent Layer

This directory contains the core interrogation agents for the Detektiv-Agenten-Orchestrator.

## Architecture

### Witness Agent (`WitnessAgent.ts`)
- **Purpose**: Answers questions based on document knowledge
- **Technology**: AnythingLLM (local RAG system with Ollama)
- **Configuration**:
  - Temperature: 0.1 (high precision, minimal hallucination)
  - Strict system prompt: Answer only from document context
  - Models tested: llama3.1:8b, qwen2:7b-instruct

### Detective Agent (`DetectiveAgent.ts`)
- **Purpose**: Intelligently interrogates Witness to extract information
- **Technology**: Multi-provider support
  - Anthropic Claude Sonnet 4 (claude-sonnet-4-20250514)
  - OpenAI GPT-4o-mini (gpt-4o-mini)
  - Gemini (coming soon)
- **Features**:
  - **4 Questioning Strategies** (like chess openings):
    1. `breadth-first`: Overview of all aspects
    2. `depth-first`: Deep dive into specific topics
    3. `contradiction`: Find inconsistencies with known facts
    4. `timeline`: Extract chronological sequences
  - **Conversation Memory**: Tracks full Q&A history with metadata
  - **Curiosity-Driven Follow-ups**: Automatically identifies interesting topics
  - **Adaptive Strategy Switching**:
    - Detects when stuck (repeated "not in document" responses)
    - Automatically switches to next strategy
    - Cycles through all 4 strategies for comprehensive interrogation

## Workflow

```
Detective Agent (Claude)
    ↓ generates question
    ↓
Witness Agent (AnythingLLM/Ollama)
    ↓ answers from document
    ↓
Detective Agent
    ↓ analyzes answer
    ↓ extracts findings & curiosity triggers
    ↓ decides: continue, switch strategy, or stop
```

## Usage Example

```typescript
import { DetectiveAgent } from './agents/DetectiveAgent';
import { WitnessAgent } from './agents/WitnessAgent';

// Setup Witness
const witness = new WitnessAgent({
  apiKey: process.env.ANYTHINGLLM_API_KEY,
  baseUrl: 'http://localhost:3001',
  workspaceSlug: 'your-workspace-slug',
});

// Setup Detective
const detective = new DetectiveAgent({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  initialStrategy: 'depth-first',
});

// Run interrogation
const result = await detective.interrogate(
  'Was passiert, wenn ein Mensch Alkohol konsumiert?',
  witness,
  10 // max iterations
);

console.log('Findings:', result.findings);
console.log('Conversation turns:', result.conversationHistory.length);
```

## Configuration

### Environment Variables
See [`.env.example`](../../.env.example) for required configuration:
- `ANTHROPIC_API_KEY`: Claude API key for Detective
- `ANYTHINGLLM_API_KEY`: AnythingLLM API key for Witness
- `ANYTHINGLLM_BASE_URL`: AnythingLLM server URL (default: http://localhost:3001)
- `WITNESS_WORKSPACE_SLUG`: AnythingLLM workspace slug

### AnythingLLM Optimization
For precise, non-hallucinating answers:
1. **Temperature**: Set to 0.1 in workspace settings
2. **System Prompt**: Use strict document-only instructions
3. **Embedding Model**: Choose appropriate model for your language

## Testing

```bash
# Test Witness Agent only
npm test -- tests/unit/agents/witness-agent.test.ts

# Test full Detective-Witness integration
npm test -- tests/unit/integration-detective-witness.test.ts
```

**Note**: Tests require:
- Ollama running locally (`ollama serve`)
- AnythingLLM running on port 3001
- Valid API keys in `.env` file
- Timeout set to 300000ms (5 minutes) for local LLM responses

## Design Decisions

### Why Multiple Strategies?
Just like chess has different openings, interrogation benefits from different approaches:
- Some documents need broad exploration first
- Others benefit from deep, focused questioning
- The Detective can switch strategies mid-interrogation based on progress

### Why Anthropic Claude for Detective?
- Superior reasoning and analysis capabilities
- Excellent instruction following for structured output
- Strong multilingual support (German/English in this project)

### Why AnythingLLM for Witness?
- Complete control over hallucination via temperature
- Local execution = data privacy
- RAG architecture = grounded answers
- Multiple LLM backends supported (Ollama, etc.)

## Future Improvements

- [ ] Add OpenAI and Gemini providers for Detective
- [ ] Implement strategy effectiveness scoring
- [ ] Add ground truth comparison for fact verification
- [ ] Multi-document interrogation support
- [ ] Parallel witness questioning (multiple workspaces)
