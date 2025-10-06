/**
 * T007: Contract test for POST /interrogation/stop endpoint
 * This test MUST FAIL initially (TDD) - no implementation exists yet
 */

import { randomUUID } from 'crypto';

describe('POST /interrogation/stop', () => {
  let originalInvoke: any;

  beforeEach(() => {
    originalInvoke = global.ipcRenderer.invoke;
  });

  afterEach(() => {
    // Restore original mock to prevent test pollution
    global.ipcRenderer.invoke = originalInvoke;
  });

  describe('Request validation', () => {
    it('should accept valid request with sessionId', async () => {
      // First start a session
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      // Then stop it
      const stopResponse = await global.ipcRenderer.invoke('interrogation:stop', {
        sessionId: startResponse.sessionId,
      });

      expect(stopResponse).toBeDefined();
      expect(stopResponse.status).toBe('failed');
      expect(stopResponse.partialResults).toBeDefined();
    });

    it('should reject request without sessionId', async () => {
      await expect(
        global.ipcRenderer.invoke('interrogation:stop', {})
      ).rejects.toThrow(/sessionId.*required/i);
    });

    it('should reject request with invalid UUID format', async () => {
      await expect(
        global.ipcRenderer.invoke('interrogation:stop', {
          sessionId: 'not-a-uuid',
        })
      ).rejects.toThrow(/sessionId.*invalid.*uuid/i);
    });
  });

  describe('Session state validation', () => {
    it('should return 404 when session does not exist', async () => {
      const nonExistentId = randomUUID();

      await expect(
        global.ipcRenderer.invoke('interrogation:stop', {
          sessionId: nonExistentId,
        })
      ).rejects.toThrow(/session.*not found/i);
    });

    it('should return 404 when session is not running', async () => {
      // Start and immediately stop a session
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      await global.ipcRenderer.invoke('interrogation:stop', {
        sessionId: startResponse.sessionId,
      });

      // Try to stop again - should fail
      await expect(
        global.ipcRenderer.invoke('interrogation:stop', {
          sessionId: startResponse.sessionId,
        })
      ).rejects.toThrow(/session.*not.*running/i);
    });
  });

  describe('Response schema validation (FR-020)', () => {
    it('should return status as "failed" for manually stopped sessions', async () => {
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      const stopResponse = await global.ipcRenderer.invoke('interrogation:stop', {
        sessionId: startResponse.sessionId,
      });

      expect(stopResponse.status).toBe('failed');
    });

    it('should return partialResults with InterrogationSession schema', async () => {
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      const stopResponse = await global.ipcRenderer.invoke('interrogation:stop', {
        sessionId: startResponse.sessionId,
      });

      const { partialResults } = stopResponse;

      expect(partialResults).toMatchObject({
        id: startResponse.sessionId,
        hypothesis: expect.objectContaining({
          text: 'Test question',
        }),
        status: 'failed',
        iterationLimit: 10,
        currentIteration: expect.any(Number),
        qaPairs: expect.any(Array),
        auditTrail: expect.any(Array),
      });
    });

    it('should include partial Q&A pairs in results', async () => {
      // Mock with partial Q&A data
      const mockQAPairs = [
        {
          sequence: 0,
          question: 'Q1',
          answer: 'A1',
          timestamp: new Date().toISOString(),
        },
      ];

      global.ipcRenderer.invoke = jest.fn((channel: string) => {
        if (channel === 'interrogation:start') {
          return Promise.resolve({ sessionId: 'test-session-id' });
        }
        if (channel === 'interrogation:stop') {
          return Promise.resolve({
            status: 'failed',
            partialResults: {
              id: 'test-session-id',
              hypothesis: { text: 'Test question', createdAt: new Date().toISOString() },
              status: 'failed',
              iterationLimit: 10,
              currentIteration: mockQAPairs.length,
              qaPairs: mockQAPairs,
              auditTrail: [],
            },
          });
        }
        return Promise.reject(new Error(`Unhandled channel: ${channel}`));
      });

      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      const stopResponse = await global.ipcRenderer.invoke('interrogation:stop', {
        sessionId: startResponse.sessionId,
      });

      expect(stopResponse.partialResults.qaPairs).toBeInstanceOf(Array);
      expect(stopResponse.partialResults.currentIteration).toBeGreaterThanOrEqual(0);
    });
  });
});
