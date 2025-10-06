/**
 * Jest global setup for IPC mocking
 * Provides mock IPC renderer interface for testing
 */

import { ipcHandlers, clearSessions } from '../src/main/ipc-handlers';

// Clear sessions before each test to ensure isolation
beforeEach(() => {
  clearSessions();
});

// Mock IPC renderer for unit tests
const mockIpcRenderer = {
  invoke: jest.fn(async (channel: string, ...args: any[]) => {
    // Check if handler exists
    const handler = ipcHandlers[channel as keyof typeof ipcHandlers];
    if (handler) {
      // Call the real handler (mock event object)
      return handler({} as any, ...args);
    }
    throw new Error(
      `IPC handler not implemented: ${channel}\nThis is expected - tests should FAIL in TDD phase!\nImplement the handler in src/main/ipc-handlers.ts`
    );
  }),
  on: jest.fn(),
  off: jest.fn(),
  send: jest.fn(),
};

// Extend global namespace
declare global {
  namespace NodeJS {
    interface Global {
      ipcRenderer: typeof mockIpcRenderer;
    }
  }
  var ipcRenderer: typeof mockIpcRenderer;
}

// Set global mock
global.ipcRenderer = mockIpcRenderer;

// Export for modules that need it
export { mockIpcRenderer };
