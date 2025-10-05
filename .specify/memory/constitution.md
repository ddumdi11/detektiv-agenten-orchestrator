# Constitution.md für GitHub Speckit
## Detektiv-Agenten-Orchestrator

---

## 🎯 Projektvision

Eine Desktop-GUI-Anwendung, die als "Detektiv-Agenten-Orchestrator" fungiert und große Cloud-LLMs (GPT-4o, Claude, Gemini) nutzt, um lokale LLMs (via Ollama/AnythingLLM) systematisch zu "verhören" und ausführliche, konsistente Antworten zu erzwingen.

**Kernkonzept**: Ein intelligenter Detektiv-Agent (Cloud-LLM) stellt iterativ Fragen an einen "Zeugen" (lokales LLM), analysiert Antworten auf Lücken und erzwingt Vollständigkeit durch Nachbohren.

---

## 🏗️ Architektur-Prinzipien

### 1. Technologie-Stack
- **Frontend**: Electron + React (moderne, plattformübergreifende Desktop-App)
- **State Management**: Zustand oder Redux für komplexe Agenten-Orchestrierung
- **API-Layer**: Axios für HTTP-Requests
- **Styling**: Tailwind CSS für schnelle UI-Entwicklung
- **Daten-Persistenz**: LocalStorage + JSON-Files für Konfigurationen
- **Build-System**: TypeScript (strict mode), node-gyp für native Module

### 1.1 Entwicklungsumgebung-Anforderungen

**Windows:**
- **Visual Studio 2022** (≥17.0.0) mit:
  - Workload: "Desktop-Entwicklung mit C++"
  - MSVC v143 x64/x86 Build Tools (Latest)
  - Windows SDK ≥10.0.15063.468
- **Node.js**: Version 18.x LTS oder neuer
- **Python**: 3.x (für node-gyp)
- **npm-Konfiguration**: `npm config set msvs_version 2022`

**Detaillierte Setup-Anleitung**: Siehe [SETUP.md](../../SETUP.md)

### 2. API-Integration-Strategie
```
Detektiv-APIs (Cloud):
├── OpenAI API (GPT-4o, GPT-4o-mini)
├── Anthropic API (Claude Sonnet 4.5)
└── Google Gemini API

Zeugen-APIs (Lokal):
├── Ollama (http://127.0.0.1:11434/v1)
└── AnythingLLM API (Workspace/RAG-Integration)
```

### 3. Kern-Architektur-Komponenten

```typescript
// Zentrale Module
src/
├── agents/
│   ├── DetectiveAgent.ts      // Verhör-Logik & Orchestrierung
│   ├── WitnessInterface.ts    // Zeugen-LLM-Wrapper
│   └── AnalysisEngine.ts      // Lücken- & Konsistenzprüfung
├── api/
│   ├── CloudLLMClient.ts      // Unified API-Client (OpenAI, Anthropic, Google)
│   ├── OllamaClient.ts        // Ollama-Integration
│   └── AnythingLLMClient.ts   // AnythingLLM-Workspace-API
├── ui/
│   ├── components/
│   │   ├── StrategyInput.tsx  // Hypothesen-Eingabe
│   │   ├── InterrogationFlow.tsx  // Verhör-Visualisierung
│   │   └── ConclusionView.tsx     // Audit-Ergebnis
│   └── store/
│       └── interrogationStore.ts  // State Management
└── config/
    └── ConfigManager.ts       // API-Keys & Einstellungen
```

---

## 📋 Requirements-Mapping zu Features

### Phase 1: Minimum Viable Product (MVP)
**Ziel**: Funktionierendes Verhör-System mit 1 Cloud-LLM + Ollama

#### Must-Have Features:
1. **CLF-02, CLF-03**: Multi-Schritt-Verhör-Loop
   ```typescript
   while (!isInterrogationComplete) {
     question = detective.generateQuestion(context);
     answer = witness.respond(question);
     gaps = detective.analyzeGaps(answer);
     if (gaps.length === 0) break;
   }
   ```

2. **API-01, API-02, API-04**: Basic API-Konfiguration
   - Ein konfigurierbares Cloud-LLM (OpenAI als Start)
   - Ollama-Endpunkt mit Standard `http://127.0.0.1:11434/v1`
   - Modell-Auswahl & Temperatur-Slider

3. **GUI-01, GUI-02**: Minimale UI
   - Textfeld für Aufgabe/Hypothese
   - Einfache Liste für Frage-Antwort-Paare
   - Start/Stop-Button

### Phase 2: Vollständige Feature-Implementierung

#### CLF-Module (Core Logic Features):
- **CLF-01**: Template-System für Verhör-Muster
  ```json
  {
    "pattern": "chronological",
    "strategy": "Stelle Fragen in zeitlicher Reihenfolge",
    "gapDetection": ["fehlende Zeitangaben", "Logiklücken"]
  }
  ```

- **CLF-04**: Konsistenz-Audit mit Scoring
  ```typescript
  interface AuditResult {
    consistencyScore: number;  // 0-100
    contradictions: string[];
    missingFacts: string[];
    conclusion: string;
  }
  ```

- **CLF-05**: Detektiv-Rollen-Editor
  - Dropdown mit Presets ("Sherlock Holmes", "Columbo", "Miss Marple")
  - Custom System-Prompt-Editor mit Syntax-Highlighting

#### API-Module:
- **API-01**: Multi-API-Manager
  ```typescript
  interface LLMProvider {
    id: string;
    name: string;
    apiKey: string;
    baseUrl?: string;
    models: string[];
  }
  ```

- **API-03**: AnythingLLM Integration
  - Workspace-Auswahl
  - RAG-Query-Option für Zeugen-Antworten

#### GUI-Module:
- **GUI-02**: Interaktive Visualisierung
  - Baumansicht mit expandierbaren Knoten
  - Farbcodierung (Grün = Vollständig, Gelb = Nachgebohrt, Rot = Widerspruch)

- **GUI-03**: Audit-Dashboard
  - Konsistenz-Score mit Gauge-Chart
  - Liste der Widersprüche mit Quellenangabe

- **GUI-04**: Konfigurationsmanagement
  - Import/Export als `.detective.json`
  - Preset-Bibliothek (Community-Strategien)

- **GUI-05**: Error-Handling-System
  - Toast-Notifications für API-Fehler
  - Connection-Status-Indicator (grün/rot)
  - Retry-Logik mit Exponential Backoff

---

## 🎨 UI/UX-Prinzipien

### 1. Layout-Struktur
```
┌─────────────────────────────────────────┐
│ [Config] [API Status 🟢] [Save/Load]    │
├─────────────────────────────────────────┤
│ Strategie & Hypothese                   │
│ ┌─────────────────────────────────────┐ │
│ │ [Große Textarea für Eingabe]        │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Verhör-Ablauf (Live)   │ Audit-Ergebnis│
│ ┌────────────────────┐ │ ┌────────────┐│
│ │ Q1: ...            │ │ │ Score: 85% ││
│ │  └─A1: ...         │ │ │            ││
│ │    └─Q2: ...       │ │ │ ✓ Konsist. ││
│ │       └─A2: ...    │ │ │ ⚠ 2 Lücken ││
│ └────────────────────┘ │ └────────────┘│
└─────────────────────────────────────────┘
```

### 2. Interaktionsdesign
- **Progressive Disclosure**: Erweiterte Einstellungen ausblendbar
- **Real-time Feedback**: Spinner während API-Calls
- **Keyboard Shortcuts**: `Ctrl+Enter` für Start, `Ctrl+S` für Speichern

---

## 🔧 Technische Spezifikationen

### API-Integration Standards

#### 1. OpenAI-Client
```typescript
async function callOpenAI(prompt: string, config: LLMConfig) {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: config.temperature,
    max_tokens: config.maxTokens
  }, {
    headers: { 'Authorization': `Bearer ${config.apiKey}` }
  });
  return response.data.choices[0].message.content;
}
```

#### 2. Ollama-Client
```typescript
async function callOllama(prompt: string, model: string) {
  const response = await axios.post('http://127.0.0.1:11434/v1/chat/completions', {
    model: model,
    messages: [{ role: 'user', content: prompt }]
  });
  return response.data.choices[0].message.content;
}
```

### Verhör-Algorithmus (Pseudocode)

```python
def interrogate(hypothesis: str, witness_model: str):
    context = {"hypothesis": hypothesis, "facts": []}
    max_iterations = 10
    
    for i in range(max_iterations):
        # Detektiv generiert Frage
        question = detective_llm.ask(
            f"Basierend auf {context}, was muss noch geklärt werden?"
        )
        
        # Zeuge antwortet
        answer = witness_llm.respond(question)
        context["facts"].append({"q": question, "a": answer})
        
        # Lücken-Analyse
        gaps = detective_llm.analyze_gaps(answer)
        
        if not gaps:
            break  # Verhör abgeschlossen
        
        # Nachbohren
        context["gaps"] = gaps
    
    # Finaler Audit
    return detective_llm.audit(context)
```

---

## 📦 Liefergegenstände (Deliverables)

### Sprint 1 (Heute, Sonntag)
1. ✅ Electron-App mit React-Setup
2. ✅ Basis-UI mit Strategie-Input
3. ✅ Ollama-Integration (Test mit lokalem Modell)
4. ✅ OpenAI-API-Integration
5. ✅ Einfacher Verhör-Loop (3-5 Iterationen)
6. ✅ README.md mit Setup-Anleitung

### Sprint 2 (Nächste Woche)
- Multi-API-Support (Anthropic, Gemini)
- Erweiterte Lücken-Analyse mit NLP-Heuristiken
- Baum-Visualisierung
- Konfigurationsspeicherung

### Sprint 3 (Future)
- AnythingLLM-Workspace-Integration
- Community-Preset-Bibliothek
- Export-Funktion (Markdown-Report)
- Batch-Verarbeitung (mehrere Fragen sequenziell)

---

## 🚦 Qualitätskriterien

### Code-Qualität
- **TypeScript strict mode**: Alle Typen explizit
- **ESLint + Prettier**: Konsistenter Code-Style
- **Unit Tests**: Mindestens 60% Coverage für `agents/` und `api/`

### Performance
- API-Calls mit Timeout (30s Maximum)
- Rate Limiting (max. 10 Requests/Minute zu Cloud-APIs)
- Caching von Ollama-Modell-Listen

### Sicherheit
- API-Keys verschlüsselt in Electron Store
- Keine Keys in Git-Repository
- Input-Sanitization gegen Prompt Injection

---

## 🎓 Entwicklungs-Guidelines

### 1. Git-Workflow
```bash
main (protected)
├── develop
│   ├── feature/api-integration
│   ├── feature/interrogation-loop
│   └── feature/ui-visualization
```

### 2. Commit-Konventionen
```
feat: Neue Feature-Implementierung
fix: Bugfix
docs: Dokumentationsänderungen
refactor: Code-Umstrukturierung ohne Funktionsänderung
test: Test-Hinzufügungen
```

### 3. Code-Review-Checkliste
- [ ] Erfüllt Anforderung aus Requirements-Tabelle
- [ ] TypeScript-Typen korrekt
- [ ] Error Handling implementiert
- [ ] UI-Feedback vorhanden

---

## 🧪 Test-Szenarien

### Test-Case 1: "Dry Oktober"-Szenario
```
Input: "Fasse das Kapitel über Niacin aus dem PDF zusammen"
Erwartung:
1. Detektiv fragt: "Was ist die Hauptfunktion von Niacin?"
2. Zeuge antwortet kurz: "Energiestoffwechsel"
3. Detektiv erkennt Lücke: "Keine Details zu Dosierung"
4. Nachfrage: "Welche Dosierungsempfehlungen gibt es?"
5. Iteration bis vollständige Antwort
```

### Test-Case 2: API-Fehlerbehandlung
```
Szenario: Ollama-Server offline
Erwartung: 
- Roter Status-Indicator
- Toast: "Ollama nicht erreichbar unter 127.0.0.1:11434"
- Button "Retry" erscheint
```

---

## 📚 Ressourcen & Links

### API-Dokumentationen
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [AnythingLLM API](https://docs.anythingllm.com/)

### Entwickler-Tools
- [Electron Forge](https://www.electronforge.io/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## ✨ Vision für die Zukunft

**Langfristige Ziele**:
1. **Multi-Zeugen-Verhöre**: Mehrere lokale LLMs parallel befragen und Antworten vergleichen
2. **Lern-Modus**: Detektiv-Agent lernt aus erfolgreichen Verhör-Strategien
3. **Plugin-System**: Community kann eigene Verhör-Muster als Plugins bereitstellen
4. **Forensische Analyse**: Automatisches Erkennen von Widersprüchen zwischen verschiedenen Zeugen

---

**Erstellt für**: GitHub Speckit Projekt  
**Ziel**: Schnelle Implementierung mit Claude Code in VS Code  
**Lizenz**: MIT (anpassbar)