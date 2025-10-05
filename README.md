# Detektiv-Agenten-Orchestrator MVP

Desktop application that uses cloud-based LLMs (detective agents) to systematically interrogate local LLMs (witness agents) through iterative questioning.

## Features

- **Iterative Interrogation**: Cloud LLM asks follow-up questions when gaps are detected
- **Gap Analysis**: Automatic detection of missing information, ambiguities, inconsistencies
- **Multi-Provider Support**: OpenAI GPT-4, Anthropic Claude, Google Gemini (cloud) + Ollama (local)
- **Provider Fallback**: Automatic switching on rate limits with audit trail
- **Session Persistence**: Save and review past interrogation sessions
- **Audit Results**: Consistency scoring, contradiction detection, comprehensive summaries

## Prerequisites

See [SETUP.md](SETUP.md) for detailed Windows build requirements:

- **Node.js**: Version 18.x LTS or newer
- **Visual Studio 2022** (≥17.0.0) with MSVC v143 Build Tools
- **Ollama**: For local LLM (witness agent)
- **API Keys**: At least one cloud LLM provider (OpenAI, Anthropic, or Gemini)

## Installation

```bash
npm install
```

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

On first launch, configure:
1. API credentials for cloud providers (detective agents)
2. Ollama connection settings (witness agent)
3. Timeout preferences (cloud: 15-120s, local: 15-360s)
4. Provider fallback order
5. Default iteration limit (5-20)

## Project Structure

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

## Documentation

- [Setup Guide](SETUP.md) - Development environment requirements
- [Contributing](CONTRIBUTING.md) - Git workflow and code standards
- [Specification](specs/001-detektiv-agenten-orchestrator/spec.md) - Feature requirements
- [Implementation Plan](specs/001-detektiv-agenten-orchestrator/plan.md) - Architecture decisions

## License

MIT
