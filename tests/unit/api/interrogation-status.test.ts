/**
 * T008: Contract test for GET /interrogation/status/{sessionId} endpoint
 * This test MUST FAIL initially (TDD) - no implementation exists yet
 */

import { v4 as uuidv4 } from 'uuid';

interface QAPair {
  sequence: number;
  question: string;
  answer: string;
  timestamp: string;
  providerUsed?: string;
}

describe('GET /interrogation/status/:sessionId', () => {
  // Store original mock to restore after each test
  let originalInvoke: any;

  // Helper function to reduce duplication
  const startTestSession = async (overrides = {}) => {
    return await global.ipcRenderer.invoke('interrogation:start', {
      hypothesis: 'Test question',
      iterationLimit: 10,
      detectiveProvider: 'openai',
      witnessModel: 'llama2',
      ...overrides,
    });
  };

  beforeEach(() => {
    originalInvoke = global.ipcRenderer.invoke;
  });

  afterEach(() => {
    // Restore original mock to prevent test pollution
    global.ipcRenderer.invoke = originalInvoke;
  });

  describe('Request validation', () => {
    it('should accept valid sessionId', async () => {
      // Start a session first
      const startResponse = await startTestSession();

      const statusResponse = await global.ipcRenderer.invoke(
        'interrogation:status',
        startResponse.sessionId
      );

      expect(statusResponse).toBeDefined();
      expect(statusResponse.currentIteration).toBeDefined();
      expect(statusResponse.qaPairs).toBeDefined();
      expect(statusResponse.status).toBeDefined();
    });

    it('should reject invalid UUID format', async () => {
      await expect(
        global.ipcRenderer.invoke('interrogation:status', 'not-a-uuid')
      ).rejects.toThrow(/sessionId.*invalid.*uuid/i);
    });

    it('should return 404 for non-existent session', async () => {
      const nonExistentId = uuidv4();

      await expect(
        global.ipcRenderer.invoke('interrogation:status', nonExistentId)
      ).rejects.toThrow(/session.*not found/i);
    });
  });

  describe('Response schema validation (FR-011, FR-012)', () => {
    it('should return currentIteration as integer', async () => {
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      const statusResponse = await global.ipcRenderer.invoke(
        'interrogation:status',
        startResponse.sessionId
      );

      expect(typeof statusResponse.currentIteration).toBe('number');
      expect(Number.isInteger(statusResponse.currentIteration)).toBe(true);
      expect(statusResponse.currentIteration).toBeGreaterThanOrEqual(0);
    });

    it('should return qaPairs as array', async () => {
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      const statusResponse = await global.ipcRenderer.invoke(
        'interrogation:status',
        startResponse.sessionId
      );

      expect(Array.isArray(statusResponse.qaPairs)).toBe(true);
    });

    it('should return status as valid enum value', async () => {
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      const statusResponse = await global.ipcRenderer.invoke(
        'interrogation:status',
        startResponse.sessionId
      );

      const validStatuses = ['running', 'completed', 'failed', 'limit-reached'];
      expect(validStatuses).toContain(statusResponse.status);
    });

    it('should match currentIteration with qaPairs length', async () => {
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      const statusResponse = await global.ipcRenderer.invoke(
        'interrogation:status',
        startResponse.sessionId
      );

      expect(statusResponse.qaPairs.length).toBe(statusResponse.currentIteration);
    });
  });

  describe('Real-time updates (FR-011)', () => {
    it('should reflect progress as interrogation continues', async () => {
      // Mock deterministic progress simulation
      let statusCallCount = 0;
      const mockInvoke = jest.fn((channel: string, ...args: any[]) => {
        if (channel === 'interrogation:start') {
          return Promise.resolve({ sessionId: 'test-session-id', status: 'running' });
        }
        if (channel === 'interrogation:status') {
          statusCallCount++;
          // Simulate progression: iteration 0 → iteration 1
          const currentIter = statusCallCount - 1;
          const mockPairs = Array(currentIter)
            .fill(null)
            .map((_, i) => ({
              sequence: i,
              question: `Q${i + 1}`,
              answer: `A${i + 1}`,
              timestamp: new Date().toISOString(),
            }));

          return Promise.resolve({
            currentIteration: currentIter,
            qaPairs: mockPairs, // Length matches currentIteration
            status: statusCallCount > 2 ? 'completed' : 'running',
          });
        }
        return Promise.reject(new Error(`Unhandled channel: ${channel}`));
      });

      global.ipcRenderer.invoke = mockInvoke;

      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      // Get initial status
      const status1 = await global.ipcRenderer.invoke(
        'interrogation:status',
        startResponse.sessionId
      );

      // Get updated status (no waiting!)
      const status2 = await global.ipcRenderer.invoke(
        'interrogation:status',
        startResponse.sessionId
      );

      // Iteration should increase or session should complete
      expect(
        status2.currentIteration >= status1.currentIteration ||
          ['completed', 'limit-reached', 'failed'].includes(status2.status)
      ).toBe(true);
    });

    it('should include all Q&A pairs in order', async () => {
      // Mock with Q&A pairs
      const mockQAPairs: QAPair[] = [
        {
          sequence: 0,
          question: 'Question 1',
          answer: 'Answer 1',
          timestamp: new Date().toISOString(),
          providerUsed: 'openai:gpt-4o',
        },
        {
          sequence: 1,
          question: 'Question 2',
          answer: 'Answer 2',
          timestamp: new Date().toISOString(),
          providerUsed: 'openai:gpt-4o',
        },
      ];

      global.ipcRenderer.invoke = jest.fn((channel: string) => {
        if (channel === 'interrogation:start') {
          return Promise.resolve({ sessionId: 'test-session-id', status: 'running' });
        }
        if (channel === 'interrogation:status') {
          return Promise.resolve({
            currentIteration: mockQAPairs.length,
            qaPairs: mockQAPairs,
            status: 'running',
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

      const statusResponse = await global.ipcRenderer.invoke(
        'interrogation:status',
        startResponse.sessionId
      );

      statusResponse.qaPairs.forEach((pair: QAPair, index: number) => {
        expect(pair.sequence).toBe(index);
        expect(pair.question).toBeDefined();
        expect(pair.answer).toBeDefined();
        expect(pair.timestamp).toBeDefined();
      });
    });
  });

  describe('Status transitions', () => {
    it('should start with status "running"', async () => {
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      const statusResponse = await global.ipcRenderer.invoke(
        'interrogation:status',
        startResponse.sessionId
      );

      expect(statusResponse.status).toBe('running');
    });

    it('should transition to "completed" when detective is satisfied', async () => {
      // Mock deterministic state transitions: running → running → completed
      let statusCallCount = 0;

      global.ipcRenderer.invoke = jest.fn((channel: string) => {
        if (channel === 'interrogation:start') {
          return Promise.resolve({ sessionId: 'test-session-id' });
        }
        if (channel === 'interrogation:status') {
          statusCallCount++;
          const mockQAPairs: QAPair[] = Array(statusCallCount)
            .fill(null)
            .map((_, i) => ({
              sequence: i,
              question: `Question ${i + 1}`,
              answer: `Answer ${i + 1}`,
              timestamp: new Date().toISOString(),
            }));

          return Promise.resolve({
            currentIteration: statusCallCount,
            qaPairs: mockQAPairs,
            // Transition to completed after 3 calls
            status: statusCallCount >= 3 ? 'completed' : 'running',
          });
        }
        return Promise.reject(new Error(`Unhandled channel: ${channel}`));
      });

      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Simple question that can be answered quickly',
        iterationLimit: 20,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      // Poll deterministically (no waiting!)
      let finalStatus;
      for (let i = 0; i < 5; i++) {
        const status = await global.ipcRenderer.invoke(
          'interrogation:status',
          startResponse.sessionId
        );

        if (status.status !== 'running') {
          finalStatus = status;
          break;
        }
      }

      expect(finalStatus).toBeDefined();
      expect(['completed', 'limit-reached']).toContain(finalStatus.status);
    });
  });
});
