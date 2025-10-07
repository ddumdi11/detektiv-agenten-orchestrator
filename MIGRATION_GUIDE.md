# Migration Guide: AnythingLLM → LangChain RAG

Dieser Guide erklärt, wie Sie von der AnythingLLM-Integration zur neuen LangChain RAG-Integration migrieren.

## Übersicht der Änderungen

### Vorher (AnythingLLM)
- ✅ Einfache Einrichtung
- ✅ Workspace-basierte Dokumente
- ✅ Schnelle Antworten
- ❌ Begrenzte Dokument-Formate (nur in AnythingLLM hochgeladen)
- ❌ Keine lokalen Embeddings
- ❌ Abhängig von externem AnythingLLM-Server

### Nachher (LangChain RAG)
- ✅ Lokale Dokument-Verarbeitung
- ✅ Mehr Dokument-Formate (PDF, DOCX, TXT, HTML)
- ✅ Semantische Suche mit Vektor-Embeddings
- ✅ Vollständige Kontrolle über Daten
- ✅ Offline-Betrieb möglich
- ❌ Komplexere Einrichtung erforderlich

## Migrationsschritte

### 1. Vorbereitung

#### Erforderliche Software installieren
```bash
# Python für ChromaDB
py -m venv chroma-env
chroma-env\Scripts\activate
pip install chromadb

# Ollama Modelle
ollama pull nomic-embed-text    # Für Embeddings
ollama pull qwen2:7b-instruct   # Für Antwort-Generierung
```

#### Services starten
```bash
# Terminal 1: ChromaDB
chroma-env\Scripts\activate
chroma run --host 0.0.0.0 --port 8000

# Terminal 2: Ollama (falls nicht läuft)
ollama serve
```

### 2. Konfiguration aktualisieren

#### In der App
1. **Öffnen Sie die App** und gehen Sie zu den Einstellungen
2. **Konfigurieren Sie Ollama:**
   - Base URL: `http://localhost:11434`
3. **Konfigurieren Sie ChromaDB:**
   - Base URL: `http://localhost:8000`
4. **API Keys:** Bleiben unverändert (für Detective-Agent)

### 3. Modus wechseln

#### In der Interrogation-Oberfläche
1. **Wählen Sie "LangChain RAG"** als Witness-Modus
2. **Laden Sie Ihre Dokumente hoch:**
   - Verwenden Sie den "Document Management" Tab
   - Unterstützte Formate: PDF, DOCX, TXT, HTML
   - Maximale Größe: 50MB pro Datei

### 4. Dokumente migrieren

#### Von AnythingLLM zu LangChain
Da die Dokumente jetzt lokal verarbeitet werden:

1. **Exportieren Sie Dokumente aus AnythingLLM** (falls nötig)
2. **Laden Sie die Dokumente in die App hoch**
3. **Warten Sie auf die Verarbeitung:**
   - Dokument wird automatisch in Chunks zerlegt
   - Embeddings werden generiert
   - Speicherung in ChromaDB

#### Automatische Verarbeitung
- **Chunking:** Dokumente werden in 500-2000 Zeichen große Chunks zerlegt
- **Embeddings:** Jeder Chunk bekommt einen Vektor (nomic-embed-text)
- **Speicherung:** Vektoren werden in ChromaDB abgelegt
- **Suche:** Semantische Suche findet relevante Chunks

### 5. Erste Interrogation testen

#### Test-Setup
1. **Wählen Sie ein hochgeladenes Dokument**
2. **Stellen Sie eine Frage** zu dem Dokumentinhalt
3. **Beobachten Sie den Prozess:**
   - Retrieval: 5 relevante Chunks werden gefunden
   - Generation: Antwort wird basierend auf Kontext erstellt
   - Zitierung: Antworten beziehen sich auf Dokumentinhalt

#### Beispiel-Frage
```
"Welche Vitamine werden im Dokument erwähnt?"
```
**AnythingLLM-Antwort:** Allgemeines Wissen + Workspace-Inhalt
**LangChain RAG-Antwort:** Spezifische Informationen aus dem hochgeladenen Dokument

### 6. Feinabstimmung

#### RAG-Settings anpassen
Im "RAG Settings" Tab können Sie optimieren:

- **Chunk Size:** Größe der Text-Abschnitte (500-2000)
- **Chunk Overlap:** Überlappung zwischen Chunks (0-500)
- **Retrieval K:** Anzahl der abgerufenen Chunks (1-20)
- **Score Threshold:** Mindest-Ähnlichkeit für Ergebnisse (0-1)

#### Performance-Optimierung
- **Für Genauigkeit:** Kleinere Chunks, höheres K
- **Für Geschwindigkeit:** Größere Chunks, niedrigeres K
- **Für Präzision:** Höherer Score Threshold

### 7. Troubleshooting

#### Häufige Probleme

**ChromaDB Verbindung fehlt:**
```bash
# Prüfen ob ChromaDB läuft
curl http://localhost:8000/api/v1/heartbeat

# Starten falls nötig
chroma-env\Scripts\activate
chroma run --host 0.0.0.0 --port 8000
```

**Ollama Modelle fehlen:**
```bash
# Verfügbare Modelle prüfen
ollama list

# Modelle installieren
ollama pull nomic-embed-text
ollama pull qwen2:7b-instruct
```

**Dokument-Verarbeitung hängt:**
- ChromaDB und Ollama müssen laufen
- Dokument darf nicht beschädigt sein
- Logs in der Konsole prüfen

#### Fallback zu AnythingLLM
Falls Probleme auftreten, können Sie jederzeit zurück zu AnythingLLM wechseln:
- Wählen Sie "AnythingLLM" als Witness-Modus
- Konfigurieren Sie Ihren AnythingLLM-Server
- Dokumente müssen in AnythingLLM hochgeladen sein

## Vorteile der Migration

### Qualität
- **Kontextbezogene Antworten:** Nur aus hochgeladenen Dokumenten
- **Keine Halluzinationen:** Antworten basieren auf tatsächlichem Inhalt
- **Zitierfähigkeit:** Jede Antwort lässt sich zu Quellen zurückverfolgen

### Kontrolle
- **Lokale Verarbeitung:** Keine Abhängigkeit von externen Services
- **Datenschutz:** Dokumente bleiben auf Ihrem Rechner
- **Offline-Betrieb:** Funktioniert ohne Internet (außer für Detective)

### Flexibilität
- **Mehr Formate:** PDF, DOCX zusätzlich zu TXT/HTML
- **Skalierbarkeit:** Mehrere Dokumente gleichzeitig
- **Anpassbarkeit:** Fine-Tuning der RAG-Parameter

## Performance-Vergleich

| Aspekt | AnythingLLM | LangChain RAG |
|--------|-------------|----------------|
| Setup-Komplexität | Einfach | Mittel |
| Dokument-Formate | Begrenzt | Vollständig |
| Antwort-Qualität | Gut | Sehr gut |
| Datenschutz | Mittel | Hoch |
| Offline-Betrieb | Nein | Ja |
| Anpassbarkeit | Begrenzt | Hoch |

## Support

Bei Problemen:
1. **Logs prüfen:** Konsole-Ausgaben enthalten detaillierte Fehlermeldungen
2. **Dokumentation:** README.md enthält Troubleshooting-Sektion
3. **Test-Dokumente:** Verwenden Sie die bereitgestellten Test-Dateien

Die Migration ist **rückwärtskompatibel** - Sie können jederzeit zwischen Modi wechseln! 🔄