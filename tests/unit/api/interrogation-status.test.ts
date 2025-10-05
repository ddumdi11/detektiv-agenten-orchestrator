/**
 * T008: Contract test for GET /interrogation/status/{sessionId} endpoint
 * This test MUST FAIL initially (TDD) - no implementation exists yet
 */

describe('GET /interrogation/status/:sessionId', () => {
  describe('Request validation', () => {
    it('should accept valid sessionId', async () => {
      // Start a session first
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
      const nonExistentId = '00000000-0000-4000-8000-000000000000';

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
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      // Initial status
      const status1 = await global.ipcRenderer.invoke(
        'interrogation:status',
        startResponse.sessionId
      );

      // Wait for potential progress
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check status again
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
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      const statusResponse = await global.ipcRenderer.invoke(
        'interrogation:status',
        startResponse.sessionId
      );

      statusResponse.qaPairs.forEach((pair: any, index: number) => {
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
      // This test depends on detective logic - might need mocking
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Simple question that can be answered quickly',
        iterationLimit: 20,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      // Poll status until completed or timeout
      let finalStatus;
      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
