# Entwicklungsumgebung Setup

## Systemvoraussetzungen

### Windows Build Tools

Für die Entwicklung von Electron-Apps mit nativen Node-Modulen unter Windows werden folgende Komponenten benötigt:

#### Visual Studio 2022 (≥17.0.0)

**Download**: [Visual Studio 2022 Community Edition](https://visualstudio.microsoft.com/de/downloads/) (kostenlos)

**Erforderliche Komponenten bei der Installation:**

1. **Workload**: "Desktop-Entwicklung mit C++" / "Desktop development with C++"
   - Im Visual Studio Installer auswählen

2. **MSVC v143 - VS 2022 C++ x64/x86 Build Tools (Latest)**
   - Unter "Einzelne Komponenten" / "Individual components"
   - Sicherstellen, dass die neueste v143-Version ausgewählt ist

3. **Windows SDK**
   - Version ≥10.0.15063.468
   - Wird normalerweise automatisch mit dem C++-Workload installiert

**C++ Standard**: Das Projekt nutzt moderne C++-Features (C++20 kompatibel)

### Node.js & Package Manager

- **Node.js**: Version 18.x LTS oder neuer
  - Download: https://nodejs.org/
  - Empfohlen: LTS-Version (Long Term Support)

- **npm**: Wird mit Node.js mitgeliefert
  - Nach Installation konfigurieren:
    ```bash
    npm config set msvs_version 2022
    ```

### Python

- **Python 3.x** (für node-gyp)
  - Download: https://www.python.org/downloads/
  - Bei Installation: "Add Python to PATH" aktivieren

### Git

- **Git für Windows**: https://git-scm.com/download/win
  - Für Versionskontrolle und Dependency-Management

---

## Installation & Einrichtung

### 1. Visual Studio 2022 Build Tools einrichten

```bash
# Nach VS 2022 Installation: npm konfigurieren
npm config set msvs_version 2022

# Prüfen, ob node-gyp die Installation erkennt
npx node-gyp --version
```

### 2. Repository klonen

```bash
git clone <repository-url>
cd Detektiv-Agenten-Orchestrator
```

### 3. Dependencies installieren

```bash
npm install
```

**Hinweis**: Bei der ersten Installation werden native Module kompiliert. Dies kann einige Minuten dauern.

### 4. Entwicklungsserver starten

```bash
npm run dev
```

---

## Häufige Probleme & Lösungen

### node-gyp Fehler: "Could not find any Visual Studio installation"

**Lösung:**
1. Visual Studio 2022 mit C++-Workload installieren
2. npm konfigurieren: `npm config set msvs_version 2022`
3. Terminal neu starten
4. `npm install` erneut ausführen

### Fehler: "Python not found"

**Lösung:**
1. Python 3.x installieren
2. Umgebungsvariable PATH prüfen
3. Terminal neu starten

### Native Module werden nicht gebaut

**Lösung:**
```bash
# npm Cache leeren
npm cache clean --force

# node_modules entfernen
rm -rf node_modules

# Neu installieren
npm install
```

---

## Optionale Tools (Empfohlen)

### IDE

- **Visual Studio Code**: https://code.visualstudio.com/
  - Empfohlene Extensions:
    - ESLint
    - Prettier
    - TypeScript and JavaScript Language Features
    - Tailwind CSS IntelliSense

### Ollama (für lokale LLM-Tests)

- **Ollama**: https://ollama.ai/
  - Standard-Port: `http://127.0.0.1:11434`
  - Test-Modell installieren: `ollama pull llama2`

### API-Keys (für Cloud-LLMs)

Für die Entwicklung werden API-Keys benötigt:

1. **OpenAI**: https://platform.openai.com/api-keys
2. **Anthropic Claude**: https://console.anthropic.com/
3. **Google Gemini**: https://makersuite.google.com/app/apikey

**Sicherheit**: API-Keys NIE in Git committen!
- Keys werden in der App-Konfiguration verschlüsselt gespeichert
- `.env` ist in `.gitignore` enthalten

---

## Verifizierung der Installation

Nach dem Setup sollten folgende Befehle funktionieren:

```bash
# Node.js & npm
node --version  # sollte v18.x oder höher zeigen
npm --version

# Python
python --version  # sollte 3.x zeigen

# Git
git --version

# Visual Studio Build Tools
npm config get msvs_version  # sollte "2022" zeigen
```

---

## Nächste Schritte

Nach erfolgreicher Einrichtung:

1. [CONTRIBUTING.md](./CONTRIBUTING.md) lesen für Entwicklungs-Guidelines
2. [README.md](./README.md) für Projekt-Übersicht
3. [Constitution.md](./.specify/memory/constitution.md) für Architektur-Prinzipien

---

**Bei Problemen**: GitHub Issues erstellen oder Dokumentation konsultieren
