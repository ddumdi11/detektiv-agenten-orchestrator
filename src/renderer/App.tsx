import React from 'react';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Detektiv-Agenten-Orchestrator MVP
        </h1>
        <p className="text-lg text-gray-700">
          Electron + React + TypeScript + Vite + Tailwind CSS is running! 🚀
        </p>
        <div className="mt-6 p-4 bg-white rounded-lg shadow">
          <p className="text-sm text-gray-600">
            Phase 3.1 (Setup) completed: T001-T005 ✓
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
