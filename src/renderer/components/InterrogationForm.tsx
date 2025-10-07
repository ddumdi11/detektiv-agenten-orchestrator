import React, { useState, useEffect } from 'react';
import type { DocumentSource } from '../preload';

interface InterrogationFormProps {
  onStartInterrogation: (config: {
    hypothesis: string;
    iterationLimit: number;
    detectiveProvider: 'openai' | 'anthropic' | 'gemini';
    witnessWorkspaceSlug?: string;
    language: 'de' | 'en';
  }) => void;
  isRunning: boolean;
  witnessMode: 'anythingllm' | 'langchain';
  onWitnessModeChange: (mode: 'anythingllm' | 'langchain') => void;
  selectedDocument: DocumentSource | null;
}

export const InterrogationForm: React.FC<InterrogationFormProps> = ({
  onStartInterrogation,
  isRunning,
  witnessMode,
  onWitnessModeChange,
  selectedDocument,
}) => {
  const [hypothesis, setHypothesis] = useState('');
  const [iterationLimit, setIterationLimit] = useState(5);
  const [detectiveProvider, setDetectiveProvider] = useState<'openai' | 'anthropic' | 'gemini'>('anthropic');
  const [witnessWorkspaceSlug, setWitnessWorkspaceSlug] = useState('');
  const [language, setLanguage] = useState<'de' | 'en'>('en');
  const [validationError, setValidationError] = useState<string>('');
  const [loadError, setLoadError] = useState<string>('');

  // Load default witness workspace on mount
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const defaultWitness = await window.electronAPI.config.getDefaultWitness();
        if (defaultWitness) {
          setWitnessWorkspaceSlug(defaultWitness);
        }
      } catch {
        setLoadError('Failed to load default witness workspace. Please enter manually.');
      }
    };

    loadDefaults();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous validation error
    setValidationError('');

    if (!hypothesis.trim()) {
      setValidationError('Please enter a hypothesis');
      return;
    }

    // Validate mode-specific requirements
    if (witnessMode === 'anythingllm' && !witnessWorkspaceSlug.trim()) {
      setValidationError('Please enter a witness workspace slug for AnythingLLM mode');
      return;
    }

    if (witnessMode === 'langchain' && !selectedDocument) {
      setValidationError('Please upload and select a document for LangChain mode');
      return;
    }

    onStartInterrogation({
      hypothesis: hypothesis.trim(),
      iterationLimit,
      detectiveProvider,
      witnessWorkspaceSlug: witnessMode === 'anythingllm' ? witnessWorkspaceSlug : undefined,
      language,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Start New Interrogation
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hypothesis Input */}
        <div>
          <label htmlFor="hypothesis" className="block text-sm font-medium text-gray-700 mb-2">
            Hypothesis
          </label>
          <textarea
            id="hypothesis"
            value={hypothesis}
            onChange={(e) => {
              setHypothesis(e.target.value);
              if (validationError) setValidationError('');
            }}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
              validationError ? 'border-red-300' : 'border-gray-300'
            }`}
            rows={4}
            placeholder="Enter the hypothesis to investigate..."
            disabled={isRunning}
          />
          {validationError && (
            <p className="mt-1 text-sm text-red-600">{validationError}</p>
          )}
        </div>

        {/* Load Error Display */}
        {loadError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">{loadError}</p>
          </div>
        )}

        {/* Detective Provider Selection */}
        <div>
          <label htmlFor="detective" className="block text-sm font-medium text-gray-700 mb-2">
            Detective Agent (Cloud LLM)
          </label>
          <select
            id="detective"
            value={detectiveProvider}
            onChange={(e) => setDetectiveProvider(e.target.value as 'openai' | 'anthropic' | 'gemini')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isRunning}
          >
            <option value="anthropic">Anthropic Claude Sonnet 4</option>
            <option value="openai">OpenAI GPT-4o-mini</option>
            <option value="gemini" disabled>Google Gemini (Coming Soon)</option>
          </select>
        </div>

        {/* Language Selection */}
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
            Interrogation Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'de' | 'en')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={isRunning}
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        {/* Witness Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Witness Mode
          </label>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                id="anythingllm"
                name="witnessMode"
                type="radio"
                value="anythingllm"
                checked={witnessMode === 'anythingllm'}
                onChange={(e) => onWitnessModeChange(e.target.value as 'anythingllm' | 'langchain')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={isRunning}
              />
              <label htmlFor="anythingllm" className="ml-2 block text-sm text-gray-900">
                <span className="font-medium">AnythingLLM</span>
                <span className="text-gray-500 ml-1">- Pre-embedded workspace documents</span>
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="langchain"
                name="witnessMode"
                type="radio"
                value="langchain"
                checked={witnessMode === 'langchain'}
                onChange={(e) => onWitnessModeChange(e.target.value as 'anythingllm' | 'langchain')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={isRunning}
              />
              <label htmlFor="langchain" className="ml-2 block text-sm text-gray-900">
                <span className="font-medium">LangChain RAG</span>
                <span className="text-gray-500 ml-1">- Local document processing</span>
              </label>
            </div>
          </div>
        </div>

        {/* AnythingLLM Configuration */}
        {witnessMode === 'anythingllm' && (
          <div>
            <label htmlFor="witness" className="block text-sm font-medium text-gray-700 mb-2">
              Witness Workspace (AnythingLLM)
            </label>
            <input
              type="text"
              id="witness"
              value={witnessWorkspaceSlug}
              onChange={(e) => setWitnessWorkspaceSlug(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="AnythingLLM workspace slug"
              disabled={isRunning}
            />
          </div>
        )}

        {/* LangChain Configuration */}
        {witnessMode === 'langchain' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Document
            </label>
            <div className={`p-3 border rounded-md ${
              selectedDocument
                ? 'border-green-300 bg-green-50'
                : 'border-yellow-300 bg-yellow-50'
            }`}>
              {selectedDocument ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-green-800">
                    {selectedDocument.filename}
                  </span>
                  <span className="text-xs text-green-600">
                    ({selectedDocument.fileType.toUpperCase()}, {Math.round(selectedDocument.fileSizeBytes / 1024)} KB)
                  </span>
                </div>
              ) : (
                <p className="text-sm text-yellow-800">
                  Please upload and select a document below to use LangChain mode.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Iteration Limit */}
        <div>
          <label htmlFor="iterations" className="block text-sm font-medium text-gray-700 mb-2">
            Iteration Limit: {iterationLimit}
          </label>
          <input
            type="range"
            id="iterations"
            min="5"
            max="20"
            value={iterationLimit}
            onChange={(e) => setIterationLimit(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={isRunning}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5</span>
            <span>20</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isRunning || !hypothesis.trim()}
          className={`w-full py-3 px-4 rounded-md font-medium text-white ${
            isRunning || !hypothesis.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          } transition-colors`}
        >
          {isRunning ? 'Interrogation Running...' : 'Start Interrogation'}
        </button>
      </form>
    </div>
  );
};
