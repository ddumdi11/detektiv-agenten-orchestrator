import React, { useState, useEffect } from 'react';

export interface RAGSettingsData {
  // Text Splitting
  chunkSize: number;
  chunkOverlap: number;

  // Embedding
  embeddingModel: string;
  ollamaBaseUrl: string;
  embeddingBatchSize: number;

  // Vector Store
  chromaBaseUrl: string;
  retrievalK: number;
  scoreThreshold: number;

  // Text Generation
  generationModel: string;
  generationTemperature: number;
}

interface RAGSettingsProps {
  settings: RAGSettingsData;
  onSettingsChange: (settings: RAGSettingsData) => void;
  onSave: () => Promise<void>;
  onReset: () => void;
}

export const RAGSettings: React.FC<RAGSettingsProps> = ({
  settings,
  onSettingsChange,
  onSave,
  onReset,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await onSave();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof RAGSettingsData>(
    key: K,
    value: RAGSettingsData[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">RAG Settings</h2>
        <div className="flex space-x-2">
          <button
            onClick={onReset}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
              isSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : saveStatus === 'success'
                ? 'bg-green-600 hover:bg-green-700'
                : saveStatus === 'error'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error!' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Text Splitting Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Text Splitting</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="chunkSize" className="block text-sm font-medium text-gray-700 mb-2">
                Chunk Size: {settings.chunkSize} characters
              </label>
              <input
                type="range"
                id="chunkSize"
                min="500"
                max="2000"
                step="50"
                value={settings.chunkSize}
                onChange={(e) => updateSetting('chunkSize', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>500</span>
                <span>2000</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Size of each text chunk for embedding
              </p>
            </div>

            <div>
              <label htmlFor="chunkOverlap" className="block text-sm font-medium text-gray-700 mb-2">
                Chunk Overlap: {settings.chunkOverlap} characters
              </label>
              <input
                type="range"
                id="chunkOverlap"
                min="0"
                max="500"
                step="25"
                value={settings.chunkOverlap}
                onChange={(e) => updateSetting('chunkOverlap', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>500</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Overlap between consecutive chunks
              </p>
            </div>
          </div>
        </div>

        {/* Embedding Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Embedding</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="embeddingModel" className="block text-sm font-medium text-gray-700 mb-2">
                Embedding Model
              </label>
              <select
                id="embeddingModel"
                value={settings.embeddingModel}
                onChange={(e) => updateSetting('embeddingModel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="nomic-embed-text">nomic-embed-text (768d)</option>
                <option value="all-MiniLM-L6-v2">all-MiniLM-L6-v2 (384d)</option>
                <option value="paraphrase-multilingual-MiniLM-L12-v2">paraphrase-multilingual (384d)</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                Model used for generating text embeddings
              </p>
            </div>

            <div>
              <label htmlFor="ollamaBaseUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Ollama Base URL
              </label>
              <input
                type="text"
                id="ollamaBaseUrl"
                value={settings.ollamaBaseUrl}
                onChange={(e) => updateSetting('ollamaBaseUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="http://localhost:11434"
              />
              <p className="text-xs text-gray-600 mt-1">
                URL where Ollama is running
              </p>
            </div>

            <div>
              <label htmlFor="embeddingBatchSize" className="block text-sm font-medium text-gray-700 mb-2">
                Batch Size: {settings.embeddingBatchSize}
              </label>
              <input
                type="range"
                id="embeddingBatchSize"
                min="1"
                max="50"
                step="1"
                value={settings.embeddingBatchSize}
                onChange={(e) => updateSetting('embeddingBatchSize', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>50</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Number of texts to embed simultaneously
              </p>
            </div>
          </div>
        </div>

        {/* Vector Store Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Vector Store</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="chromaBaseUrl" className="block text-sm font-medium text-gray-700 mb-2">
                ChromaDB Base URL
              </label>
              <input
                type="text"
                id="chromaBaseUrl"
                value={settings.chromaBaseUrl}
                onChange={(e) => updateSetting('chromaBaseUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="http://localhost:8000"
              />
              <p className="text-xs text-gray-600 mt-1">
                URL where ChromaDB is running
              </p>
            </div>

            <div>
              <label htmlFor="retrievalK" className="block text-sm font-medium text-gray-700 mb-2">
                Retrieval K: {settings.retrievalK}
              </label>
              <input
                type="range"
                id="retrievalK"
                min="1"
                max="20"
                step="1"
                value={settings.retrievalK}
                onChange={(e) => updateSetting('retrievalK', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1</span>
                <span>20</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Number of similar chunks to retrieve
              </p>
            </div>

            <div>
              <label htmlFor="scoreThreshold" className="block text-sm font-medium text-gray-700 mb-2">
                Score Threshold: {settings.scoreThreshold.toFixed(2)}
              </label>
              <input
                type="range"
                id="scoreThreshold"
                min="0"
                max="1"
                step="0.05"
                value={settings.scoreThreshold}
                onChange={(e) => updateSetting('scoreThreshold', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.00</span>
                <span>1.00</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Minimum similarity score (0 = no filter)
              </p>
            </div>
          </div>
        </div>

        {/* Text Generation Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Text Generation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="generationModel" className="block text-sm font-medium text-gray-700 mb-2">
                Generation Model
              </label>
              <select
                id="generationModel"
                value={settings.generationModel}
                onChange={(e) => updateSetting('generationModel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="qwen2.5:7b">Qwen2.5 7B</option>
                <option value="llama2:7b">Llama 2 7B</option>
                <option value="mistral:7b">Mistral 7B</option>
                <option value="phi3:3.8b">Phi-3 3.8B</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                Model used for generating witness responses
              </p>
            </div>

            <div>
              <label htmlFor="generationTemperature" className="block text-sm font-medium text-gray-700 mb-2">
                Temperature: {settings.generationTemperature.toFixed(1)}
              </label>
              <input
                type="range"
                id="generationTemperature"
                min="0"
                max="2"
                step="0.1"
                value={settings.generationTemperature}
                onChange={(e) => updateSetting('generationTemperature', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.0</span>
                <span>2.0</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Response creativity (0 = deterministic, 2 = very creative)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};