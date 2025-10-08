import React, { useState, useEffect } from 'react';
import { InterrogationForm } from './components/InterrogationForm';
import { ProgressDisplay } from './components/ProgressDisplay';
import { SessionHistory } from './components/SessionHistory';
import { SessionDetail } from './components/SessionDetail';
import { DocumentManagement } from './components/DocumentManagement';
import { RAGSettings } from './components/RAGSettings';
import type { InterrogationProgress, SessionListItem, InterrogationSession, DocumentSource } from './preload';

const App: React.FC = () => {
  const [currentProgress, setCurrentProgress] = useState<InterrogationProgress | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<InterrogationSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [witnessMode, setWitnessMode] = useState<'anythingllm' | 'langchain'>('anythingllm');
  const [selectedDocument, setSelectedDocument] = useState<DocumentSource | null>(null);
  const [ragSettings, setRagSettings] = useState({
    chunkSize: 1000,
    chunkOverlap: 200,
    embeddingModel: 'nomic-embed-text',
    ollamaBaseUrl: 'http://localhost:11434',
    embeddingBatchSize: 10,
    chromaBaseUrl: 'http://localhost:8000',
    retrievalK: 5,
    scoreThreshold: 0,
    generationModel: 'qwen2.5:7b',
    generationTemperature: 0.1,
  });

  // Load session history and RAG settings on mount
  useEffect(() => {
    loadSessions();
    loadRagSettings();
  }, []);

  const loadRagSettings = async () => {
    try {
      const settings = await window.electronAPI.rag.getSettings();
      setRagSettings(settings);
    } catch (error) {
      console.error('Failed to load RAG settings:', error);
      // Keep default settings on error
    }
  };

  // Subscribe to progress updates
  useEffect(() => {
    const unsubscribe = window.electronAPI.interrogation.onProgress((progress) => {
      // If this is a new session (different sessionId), clear old progress
      if (currentProgress && currentProgress.sessionId !== progress.sessionId) {
        // New session started - clear old findings
        setCurrentProgress(null);
      }

      setCurrentProgress(progress);

      // Update running state
      if (progress.status === 'running') {
        setIsRunning(true);
      } else {
        setIsRunning(false);
        // Reload sessions when interrogation completes
        loadSessions();
      }
    });

    return unsubscribe;
  }, [currentProgress]);

  const loadSessions = async () => {
    try {
      const result = await window.electronAPI.sessions.list();
      setSessions(result.sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleStartInterrogation = async (config: {
    hypothesis: string;
    iterationLimit: number;
    detectiveProvider: 'openai' | 'anthropic' | 'gemini';
    witnessWorkspaceSlug?: string;
    language: 'de' | 'en';
  }) => {
    try {
      setIsRunning(true);

      const interrogationConfig = {
        ...config,
        witnessMode,
        // AnythingLLM mode
        ...(witnessMode === 'anythingllm' && {
          witnessWorkspaceSlug: config.witnessWorkspaceSlug,
        }),
        // LangChain mode
        ...(witnessMode === 'langchain' && selectedDocument && {
          documentPath: selectedDocument.filePath,
          ollamaBaseUrl: ragSettings.ollamaBaseUrl,
          chromaBaseUrl: ragSettings.chromaBaseUrl,
          collectionName: selectedDocument.vectorStoreCollectionId,
        }),
      };

      await window.electronAPI.interrogation.start(interrogationConfig);
    } catch (error) {
      console.error('Failed to start interrogation:', error);
      alert(`Failed to start interrogation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsRunning(false);
    }
  };

  const handleStopInterrogation = async () => {
    if (!currentProgress) return;

    try {
      await window.electronAPI.interrogation.stop(currentProgress.sessionId);
      setIsRunning(false);
    } catch (error) {
      console.error('Failed to stop interrogation:', error);
      alert(`Failed to stop interrogation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      const session = await window.electronAPI.sessions.load(sessionId);
      setSelectedSessionId(sessionId);
      setSelectedSession(session);
    } catch (error) {
      console.error('Failed to load session:', error);
      alert(`Failed to load session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCloseSessionDetail = () => {
    setSelectedSessionId(null);
    setSelectedSession(null);
  };

  const handleWitnessModeChange = (mode: 'anythingllm' | 'langchain') => {
    setWitnessMode(mode);
    // Clear selected document when switching away from langchain mode
    if (mode !== 'langchain') {
      setSelectedDocument(null);
    }
  };

  const handleDocumentSelect = (document: DocumentSource) => {
    setSelectedDocument(document);
  };

  const handleRagSettingsChange = (settings: typeof ragSettings) => {
    setRagSettings(settings);
  };

  const handleSaveRagSettings = async () => {
    await window.electronAPI.rag.saveSettings(ragSettings);
  };

  const handleResetRagSettings = () => {
    setRagSettings({
      chunkSize: 1000,
      chunkOverlap: 200,
      embeddingModel: 'nomic-embed-text',
      ollamaBaseUrl: 'http://localhost:11434',
      embeddingBatchSize: 10,
      chromaBaseUrl: 'http://localhost:8000',
      retrievalK: 5,
      scoreThreshold: 0,
      generationModel: 'qwen2.5:7b',
      generationTemperature: 0.1,
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            🔍 Detektiv-Agenten-Orchestrator
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Cloud LLMs interrogating Local LLMs for truth discovery
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Interrogation & Documents */}
          <div className="space-y-6">
            <InterrogationForm
              onStartInterrogation={handleStartInterrogation}
              isRunning={isRunning}
              witnessMode={witnessMode}
              onWitnessModeChange={handleWitnessModeChange}
              selectedDocument={selectedDocument}
            />

            {witnessMode === 'langchain' && (
              <DocumentManagement
                onDocumentSelect={handleDocumentSelect}
                onDocumentDeleted={() => setSelectedDocument(null)}
                selectedDocumentId={selectedDocument?.id}
              />
            )}

            {currentProgress && (
              <ProgressDisplay
                progress={currentProgress}
                onStop={handleStopInterrogation}
              />
            )}
          </div>

          {/* Middle Column - Session History */}
          <div className="lg:col-span-1">
            <SessionHistory
              sessions={sessions}
              onSelectSession={handleSelectSession}
              selectedSessionId={selectedSessionId}
            />
          </div>

          {/* Right Column - Settings and Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Mode Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Mode Information</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    witnessMode === 'anythingllm'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {witnessMode === 'anythingllm' ? 'AnythingLLM' : 'LangChain RAG'}
                  </span>
                </div>

                {witnessMode === 'anythingllm' && (
                  <p className="text-sm text-gray-600">
                    Uses pre-embedded workspace documents. Quick to start, works with existing AnythingLLM setup.
                  </p>
                )}

                {witnessMode === 'langchain' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Uses local document processing with Ollama and ChromaDB. More control over embeddings and retrieval.
                    </p>
                    {selectedDocument ? (
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">Selected:</span> {selectedDocument.filename}
                      </div>
                    ) : (
                      <div className="text-sm text-amber-600">
                        Please upload and select a document to use LangChain mode.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RAG Settings - Only show in LangChain mode */}
            {witnessMode === 'langchain' && (
              <RAGSettings
                settings={ragSettings}
                onSettingsChange={handleRagSettingsChange}
                onSave={handleSaveRagSettings}
                onReset={handleResetRagSettings}
              />
            )}
          </div>
        </div>
      </main>

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetail
          session={selectedSession}
          onClose={handleCloseSessionDetail}
        />
      )}
    </div>
  );
};

export default App;
