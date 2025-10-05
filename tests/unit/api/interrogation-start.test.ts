/**
 * T006: Contract test for POST /interrogation/start endpoint
 * This test MUST FAIL initially (TDD) - no implementation exists yet
 */

describe('POST /interrogation/start', () => {
  describe('Request validation', () => {
    it('should accept valid request with all required fields', async () => {
      // Valid request per contracts/interrogation-api.json
      const validRequest = {
        hypothesis: 'Summarize the health benefits of Vitamin B3',
        iterationLimit: 10,
        detectiveProvider: 'openai' as const,
        witnessModel: 'llama2',
      };

      // This will FAIL - handler doesn't exist yet
      const response = await global.ipcRenderer.invoke('interrogation:start', validRequest);

      expect(response).toBeDefined();
      expect(response.sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(response.status).toBe('running');
    });

    it('should reject request with missing hypothesis', async () => {
      const invalidRequest = {
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      };

      await expect(
        global.ipcRenderer.invoke('interrogation:start', invalidRequest)
      ).rejects.toThrow(/hypothesis.*required/i);
    });

    it('should reject request with empty hypothesis', async () => {
      const invalidRequest = {
        hypothesis: '',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      };

      await expect(
        global.ipcRenderer.invoke('interrogation:start', invalidRequest)
      ).rejects.toThrow(/hypothesis.*empty/i);
    });

    it('should reject iteration limit below minimum (5)', async () => {
      const invalidRequest = {
        hypothesis: 'Test question',
        iterationLimit: 3,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      };

      await expect(
        global.ipcRenderer.invoke('interrogation:start', invalidRequest)
      ).rejects.toThrow(/iterationLimit.*minimum.*5/i);
    });

    it('should reject iteration limit above maximum (20)', async () => {
      const invalidRequest = {
        hypothesis: 'Test question',
        iterationLimit: 25,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      };

      await expect(
        global.ipcRenderer.invoke('interrogation:start', invalidRequest)
      ).rejects.toThrow(/iterationLimit.*maximum.*20/i);
    });

    it('should reject invalid detective provider', async () => {
      const invalidRequest = {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'invalid-provider',
        witnessModel: 'llama2',
      };

      await expect(
        global.ipcRenderer.invoke('interrogation:start', invalidRequest)
      ).rejects.toThrow(/detectiveProvider.*invalid/i);
    });

    it('should accept all valid detective providers (openai, anthropic, gemini)', async () => {
      const providers = ['openai', 'anthropic', 'gemini'] as const;

      for (const provider of providers) {
        const request = {
          hypothesis: 'Test question',
          iterationLimit: 10,
          detectiveProvider: provider,
          witnessModel: 'llama2',
        };

        const response = await global.ipcRenderer.invoke('interrogation:start', request);
        expect(response.sessionId).toBeDefined();

        // Stop session to comply with single-active-session constraint
        await global.ipcRenderer.invoke('interrogation:stop', {
          sessionId: response.sessionId,
        });
      }
    });
  });

  describe('Session state validation (FR-029)', () => {
    it('should return 409 error when another session is already running', async () => {
      const request = {
        hypothesis: 'First question',
        iterationLimit: 10,
        detectiveProvider: 'openai' as const,
        witnessModel: 'llama2',
      };

      // Start first session
      await global.ipcRenderer.invoke('interrogation:start', request);

      // Try to start second session - should fail
      await expect(
        global.ipcRenderer.invoke('interrogation:start', {
          ...request,
          hypothesis: 'Second question',
        })
      ).rejects.toThrow(/session.*already.*running/i);
    });
  });

  describe('Response schema validation', () => {
    it('should return sessionId as UUID v4', async () => {
      const request = {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai' as const,
        witnessModel: 'llama2',
      };

      const response = await global.ipcRenderer.invoke('interrogation:start', request);

      // UUID v4 regex: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(response.sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should return status as "running"', async () => {
      const request = {
        hypothesis: 'Test question',
        iterationLimit: 10,
        detectiveProvider: 'openai' as const,
        witnessModel: 'llama2',
      };

      const response = await global.ipcRenderer.invoke('interrogation:start', request);

      expect(response.status).toBe('running');
    });
  });
});
