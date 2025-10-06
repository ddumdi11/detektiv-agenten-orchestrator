// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Interrogation methods
  interrogation: {
    start: (args: {
      hypothesis: string;
      iterationLimit: number;
      detectiveProvider: 'openai' | 'anthropic' | 'gemini';
      witnessModel: string;
    }) => ipcRenderer.invoke('interrogation:start', args),

    stop: (sessionId: string) => ipcRenderer.invoke('interrogation:stop', { sessionId }),

    getStatus: (sessionId: string) => ipcRenderer.invoke('interrogation:status', sessionId),

    onProgress: (callback: (progress: any) => void) => {
      const subscription = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('interrogation:progress', subscription);

      // Return unsubscribe function
      return () => {
        ipcRenderer.removeListener('interrogation:progress', subscription);
      };
    },
  },

  // Session methods
  sessions: {
    list: () => ipcRenderer.invoke('sessions:list'),

    load: (sessionId: string) => ipcRenderer.invoke('sessions:load', sessionId),
  },

  // Config methods
  config: {
    updateCredentials: (args: {
      provider: 'openai' | 'anthropic' | 'gemini';
      apiKey: string;
      model: string;
    }) => ipcRenderer.invoke('config:updateCredentials', args),

    getDefaultDetective: () => ipcRenderer.invoke('config:getDefaultDetective'),

    getDefaultWitness: () => ipcRenderer.invoke('config:getDefaultWitness'),

    getRaw: () => ipcRenderer.invoke('config:getRaw'),
  },
});
