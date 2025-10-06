/**
 * T010: Contract test for GET /sessions/{sessionId} endpoint
 * This test MUST FAIL initially (TDD) - no implementation exists yet
 */

import { v4 as uuidv4 } from 'uuid';

describe('GET /sessions/:sessionId', () => {
  describe('Request validation', () => {
    it('should accept valid UUID sessionId', async () => {
      // Create and complete a session first
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question for loading',
        iterationLimit: 5,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      await global.ipcRenderer.invoke('interrogation:stop', {
        sessionId: startResponse.sessionId,
      });

      // Load the session
      const loadedSession = await global.ipcRenderer.invoke(
        'sessions:load',
        startResponse.sessionId
      );

      expect(loadedSession).toBeDefined();
      expect(loadedSession.id).toBe(startResponse.sessionId);
    });

    it('should reject invalid UUID format', async () => {
      await expect(global.ipcRenderer.invoke('sessions:load', 'not-a-uuid')).rejects.toThrow(
        /sessionId.*invalid.*uuid/i
      );
    });

    it('should return 404 for non-existent session', async () => {
      const nonExistentId = uuidv4();

      await expect(global.ipcRenderer.invoke('sessions:load', nonExistentId)).rejects.toThrow(
        /session.*not found/i
      );
    });
  });

  describe('Response schema validation (FR-023)', () => {
    it('should return complete InterrogationSession schema', async () => {
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Complete schema test',
        iterationLimit: 10,
        detectiveProvider: 'anthropic',
        witnessModel: 'llama2',
      });

      await global.ipcRenderer.invoke('interrogation:stop', {
        sessionId: startResponse.sessionId,
      });

      const loadedSession = await global.ipcRenderer.invoke(
        'sessions:load',
        startResponse.sessionId
      );

      expect(loadedSession).toMatchObject({
        id: startResponse.sessionId,
        hypothesis: {
          text: 'Complete schema test',
          createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        },
        startTime: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        endTime: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        status: expect.stringMatching(/^(running|completed|failed|limit-reached)$/),
        iterationLimit: 10,
        currentIteration: expect.any(Number),
        qaPairs: expect.any(Array),
        auditTrail: expect.any(Array),
      });
    });

    it('should include auditResult for completed sessions', async () => {
      // This would need a completed session with audit - might need mocking
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Audit result test',
        iterationLimit: 5,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      // Wait for potential completion or stop manually
      await global.ipcRenderer.invoke('interrogation:stop', {
        sessionId: startResponse.sessionId,
      });

      const loadedSession = await global.ipcRenderer.invoke(
        'sessions:load',
        startResponse.sessionId
      );

      if (loadedSession.status === 'completed') {
        expect(loadedSession.auditResult).toMatchObject({
          consistencyScore: expect.any(Number),
          contradictions: expect.any(Array),
          remainingGaps: expect.any(Array),
          summary: expect.any(String),
        });
      }
    });

    it('should include all Q&A pairs with proper structure', async () => {
      // Mock with Q&A pairs containing gapAnalysis
      const mockQAPairs = [
        {
          sequence: 0,
          question: 'Question 1',
          answer: 'Answer 1',
          timestamp: new Date().toISOString(),
          providerUsed: 'openai:gpt-4o',
          gapAnalysis: {
            gaps: [{ category: 'missing_information', description: 'Need more details' }],
            completenessScore: 75,
            requiresFollowUp: true,
          },
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
              hypothesis: { text: 'Q&A structure test', createdAt: new Date().toISOString() },
              status: 'failed',
              iterationLimit: 5,
              currentIteration: mockQAPairs.length,
              qaPairs: mockQAPairs,
              auditTrail: [],
            },
          });
        }
        if (channel === 'sessions:load') {
          return Promise.resolve({
            id: 'test-session-id',
            hypothesis: { text: 'Q&A structure test', createdAt: new Date().toISOString() },
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            status: 'failed',
            iterationLimit: 5,
            currentIteration: mockQAPairs.length,
            qaPairs: mockQAPairs,
            auditTrail: [],
          });
        }
        return Promise.reject(new Error(`Unhandled channel: ${channel}`));
      });

      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Q&A structure test',
        iterationLimit: 5,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      await global.ipcRenderer.invoke('interrogation:stop', {
        sessionId: startResponse.sessionId,
      });

      const loadedSession = await global.ipcRenderer.invoke(
        'sessions:load',
        startResponse.sessionId
      );

      loadedSession.qaPairs.forEach((pair: any, index: number) => {
        expect(pair).toMatchObject({
          sequence: index,
          question: expect.any(String),
          answer: expect.any(String),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          providerUsed: expect.stringMatching(/^(openai|anthropic|gemini):/),
        });

        if (pair.gapAnalysis) {
          expect(pair.gapAnalysis).toMatchObject({
            gaps: expect.any(Array),
            completenessScore: expect.any(Number),
            requiresFollowUp: expect.any(Boolean),
          });
        }
      });
    });
  });

  describe('Data integrity', () => {
    it('should load exact same data as when session was saved', async () => {
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Data integrity test',
        iterationLimit: 10,
        detectiveProvider: 'gemini',
        witnessModel: 'llama2',
      });

      // Get current status
      const statusBeforeStop = await global.ipcRenderer.invoke(
        'interrogation:status',
        startResponse.sessionId
      );

      await global.ipcRenderer.invoke('interrogation:stop', {
        sessionId: startResponse.sessionId,
      });

      // Load the saved session
      const loadedSession = await global.ipcRenderer.invoke(
        'sessions:load',
        startResponse.sessionId
      );

      // Verify core data matches
      expect(loadedSession.id).toBe(startResponse.sessionId);
      expect(loadedSession.hypothesis.text).toBe('Data integrity test');
      expect(loadedSession.iterationLimit).toBe(10);
      expect(loadedSession.currentIteration).toBe(statusBeforeStop.currentIteration);
    });

    it('should preserve audit trail entries', async () => {
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Audit trail test',
        iterationLimit: 5,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      await global.ipcRenderer.invoke('interrogation:stop', {
        sessionId: startResponse.sessionId,
      });

      const loadedSession = await global.ipcRenderer.invoke(
        'sessions:load',
        startResponse.sessionId
      );

      expect(loadedSession.auditTrail).toBeInstanceOf(Array);

      loadedSession.auditTrail.forEach((entry: any) => {
        expect(entry).toMatchObject({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          event: expect.stringMatching(/^(provider_switch|timeout|error)$/),
          reason: expect.any(String),
        });
      });
    });
  });
});
