# Contributing Guidelines

Vielen Dank für dein Interesse am Detektiv-Agenten-Orchestrator! Diese Anleitung hilft dir beim Beitragen zum Projekt.

---

## 🚀 Quick Start

1. **Setup**: Siehe [SETUP.md](./SETUP.md) für Entwicklungsumgebung
2. **Architektur**: Lies [.specify/memory/constitution.md](./.specify/memory/constitution.md)
3. **Branch erstellen**: `git checkout -b feature/dein-feature`
4. **Entwickeln**: Code schreiben + Tests
5. **Commit**: Konventionen beachten (siehe unten)
6. **Pull Request**: Erstellen und Review abwarten

---

## 📋 Entwicklungs-Workflow

### Git Branching-Strategie

```
main (protected)
├── develop
│   ├── feature/api-integration
│   ├── feature/interrogation-loop
│   ├── feature/ui-visualization
│   ├── fix/ollama-connection
│   └── docs/setup-guide
```

**Branch-Namenskonventionen:**
- `feature/*` - Neue Features
- `fix/*` - Bugfixes
- `refactor/*` - Code-Umstrukturierung
- `docs/*` - Dokumentationsänderungen
- `test/*` - Test-Hinzufügungen

### Commit-Konventionen

Wir nutzen [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: Neue Feature-Implementierung
- `fix`: Bugfix
- `docs`: Dokumentationsänderungen
- `refactor`: Code-Umstrukturierung ohne Funktionsänderung
- `test`: Test-Hinzufügungen
- `chore`: Build-Prozess, Dependencies, etc.
- `style`: Code-Formatierung (keine funktionalen Änderungen)

**Beispiele:**
```bash
git commit -m "feat: add Anthropic Claude API integration"
git commit -m "fix: handle Ollama connection timeout"
git commit -m "docs: update setup guide with Python requirements"
```

---

## 🏗️ Code-Qualität

### TypeScript Standards

- **Strict Mode**: Immer aktiviert
- **Explizite Typen**: Keine `any` ohne Kommentar
- **Interfaces vor Types**: Für Objekt-Strukturen

**Beispiel:**
```typescript
// ✅ Gut
interface LLMConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

// ❌ Schlecht
const config: any = { ... };
```

### ESLint & Prettier

```bash
# Vor jedem Commit ausführen
npm run lint
npm run format
```

**Automatische Formatierung in VS Code:**
- `settings.json`:
  ```json
  {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
  ```

### Datei-Struktur

```typescript
// src/api/CloudLLMClient.ts
import axios from 'axios';

/**
 * Unified client for Cloud LLM APIs (OpenAI, Anthropic, Gemini)
 */
export class CloudLLMClient {
  constructor(private config: LLMConfig) {}

  async query(prompt: string): Promise<string> {
    // Implementation
  }
}
```

**Regeln:**
- Ein Export pro Datei (außer Utils)
- JSDoc-Kommentare für öffentliche APIs
- Imports alphabetisch sortiert

---

## 🧪 Testing

### Test-Anforderungen

- **Minimum Coverage**: 60% für `src/agents/` und `src/api/`
- **Unit Tests**: Für jede neue Funktion
- **Integration Tests**: Für API-Interaktionen

### Tests ausführen

```bash
# Alle Tests
npm test

# Mit Coverage
npm run test:coverage

# Watch Mode
npm run test:watch
```

### Test-Beispiel

```typescript
// src/agents/__tests__/DetectiveAgent.test.ts
import { DetectiveAgent } from '../DetectiveAgent';

describe('DetectiveAgent', () => {
  it('should generate initial question from hypothesis', async () => {
    const agent = new DetectiveAgent(mockConfig);
    const question = await agent.generateQuestion('Test hypothesis');

    expect(question).toBeDefined();
    expect(question.length).toBeGreaterThan(10);
  });
});
```

---

## 🎨 UI/UX-Richtlinien

### React-Komponenten

```typescript
// src/ui/components/InterrogationFlow.tsx
import React from 'react';

interface InterrogationFlowProps {
  questions: Question[];
  onNewQuestion: (q: Question) => void;
}

export const InterrogationFlow: React.FC<InterrogationFlowProps> = ({
  questions,
  onNewQuestion
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Component content */}
    </div>
  );
};
```

**Best Practices:**
- Functional Components mit TypeScript
- Props-Interface definieren
- Tailwind CSS für Styling
- Keine Inline-Styles

### Accessibility

- `aria-label` für Icon-Buttons
- Keyboard-Navigation unterstützen
- Farbkontrast beachten (WCAG AA)

---

## 🔒 Sicherheit

### API-Keys

```typescript
// ❌ NIEMALS
const apiKey = "sk-1234567890abcdef";

// ✅ Richtig
import { ConfigManager } from './config/ConfigManager';
const apiKey = ConfigManager.getApiKey('openai');
```

**Regeln:**
- Keine Keys in Code
- Keine Keys in Git
- Electron Store für verschlüsselte Speicherung

### Input-Sanitization

```typescript
// Prompt Injection verhindern
function sanitizeUserInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // HTML-Tags entfernen
    .trim()
    .slice(0, 10000); // Maximale Länge
}
```

---

## 📝 Code-Review-Checkliste

Vor dem Pull Request sicherstellen:

- [ ] **Tests**: Alle Tests laufen durch (`npm test`)
- [ ] **Linting**: Keine ESLint-Fehler (`npm run lint`)
- [ ] **Types**: TypeScript kompiliert ohne Fehler (`npm run build`)
- [ ] **Dokumentation**: JSDoc für neue öffentliche APIs
- [ ] **Requirements**: Erfüllt Anforderung aus Constitution
- [ ] **UI-Feedback**: Ladezustände/Fehler werden angezeigt
- [ ] **Error Handling**: Try-Catch für API-Calls
- [ ] **Security**: Keine API-Keys im Code

---

## 🐛 Bug Reports

### Issue-Template

```markdown
**Beschreibung**: Kurze Zusammenfassung des Bugs

**Schritte zur Reproduktion**:
1. App starten
2. Ollama-Endpunkt auf localhost:11434 setzen
3. Verhör starten
4. Fehler tritt auf

**Erwartetes Verhalten**: Was sollte passieren?

**Aktuelles Verhalten**: Was passiert stattdessen?

**Umgebung**:
- OS: Windows 11
- Node.js: v18.17.0
- Electron: v27.0.0
```

---

## 🎯 Feature Requests

Neue Features sollten:
1. Mit Constitution-Prinzipien übereinstimmen
2. Use Case beschreiben
3. Mockups/Wireframes enthalten (bei UI-Features)
4. Performance-Implikationen berücksichtigen

**Diskussion**: Öffne ein Issue bevor du mit der Implementierung startest!

---

## 📚 Ressourcen

### Projekt-Dokumentation
- [Constitution.md](./.specify/memory/constitution.md) - Architektur & Prinzipien
- [SETUP.md](./SETUP.md) - Entwicklungsumgebung
- [README.md](./README.md) - Projekt-Übersicht

### Externe Docs
- [Electron Documentation](https://www.electronjs.org/docs/latest)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## 💬 Kommunikation

- **GitHub Issues**: Bug Reports & Feature Requests
- **Pull Requests**: Code-Reviews & Diskussionen
- **Commit Messages**: Technische Details

---

## 📜 Lizenz

Durch Beiträge akzeptierst du, dass dein Code unter der MIT-Lizenz veröffentlicht wird.

---

**Vielen Dank für deinen Beitrag! 🎉**
