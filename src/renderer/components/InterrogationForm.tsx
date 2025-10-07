import React, { useState, useEffect } from 'react';

interface InterrogationFormProps {
  onStartInterrogation: (config: {
    hypothesis: string;
    iterationLimit: number;
    detectiveProvider: 'openai' | 'anthropic' | 'gemini';
    witnessModel: string;
    language: 'de' | 'en';
  }) => void;
  isRunning: boolean;
}

export const InterrogationForm: React.FC<InterrogationFormProps> = ({
  onStartInterrogation,
  isRunning,
}) => {
  const [hypothesis, setHypothesis] = useState('');
  const [iterationLimit, setIterationLimit] = useState(10);
  const [detectiveProvider, setDetectiveProvider] = useState<'openai' | 'anthropic' | 'gemini'>('anthropic');
  const [witnessModel, setWitnessModel] = useState('');
  const [language, setLanguage] = useState<'de' | 'en'>('en');

  // Load default witness workspace on mount
  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const defaultWitness = await window.electronAPI.config.getDefaultWitness();
        if (defaultWitness) {
          setWitnessModel(defaultWitness);
        }
      } catch (error) {
        console.error('Failed to load default witness:', error);
      }
    };

    loadDefaults();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hypothesis.trim()) {
      alert('Please enter a hypothesis');
      return;
    }

    onStartInterrogation({
      hypothesis: hypothesis.trim(),
      iterationLimit,
      detectiveProvider,
      witnessModel,
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
            onChange={(e) => setHypothesis(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Enter the hypothesis to investigate..."
            disabled={isRunning}
          />
        </div>

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

        {/* Witness Model Input */}
        <div>
          <label htmlFor="witness" className="block text-sm font-medium text-gray-700 mb-2">
            Witness Agent (Local LLM)
          </label>
          <input
            type="text"
            id="witness"
            value={witnessModel}
            onChange={(e) => setWitnessModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="AnythingLLM workspace slug"
            disabled={isRunning}
          />
        </div>

        {/* Iteration Limit */}
        <div>
          <label htmlFor="iterations" className="block text-sm font-medium text-gray-700 mb-2">
            Iteration Limit: {iterationLimit}
          </label>
          <input
            type="range"
            id="iterations"
            min="1"
            max="20"
            value={iterationLimit}
            onChange={(e) => setIterationLimit(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={isRunning}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
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
