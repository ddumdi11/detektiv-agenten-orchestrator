import React, { useState, useEffect } from 'react';
import { InterrogationForm } from './components/InterrogationForm';
import { ProgressDisplay } from './components/ProgressDisplay';
import { SessionHistory } from './components/SessionHistory';
import { SessionDetail } from './components/SessionDetail';
import type { InterrogationProgress, SessionListItem, InterrogationSession } from './preload';

const App: React.FC = () => {
  const [currentProgress, setCurrentProgress] = useState<InterrogationProgress | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<InterrogationSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Load session history on mount
  useEffect(() => {
    loadSessions();
  }, []);

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
    witnessWorkspaceSlug: string;
    language: 'de' | 'en';
  }) => {
    try {
      setIsRunning(true);
      // For now, default to anythingllm mode with backward compatibility
      await window.electronAPI.interrogation.start({
        ...config,
        witnessMode: 'anythingllm',
        witnessWorkspaceSlug: config.witnessWorkspaceSlug,
      });
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <InterrogationForm
              onStartInterrogation={handleStartInterrogation}
              isRunning={isRunning}
            />

            {currentProgress && (
              <ProgressDisplay
                progress={currentProgress}
                onStop={handleStopInterrogation}
              />
            )}
          </div>

          {/* Right Column */}
          <div>
            <SessionHistory
              sessions={sessions}
              onSelectSession={handleSelectSession}
              selectedSessionId={selectedSessionId}
            />
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
