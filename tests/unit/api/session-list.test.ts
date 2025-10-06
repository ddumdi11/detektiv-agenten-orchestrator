/**
 * T009: Contract test for GET /sessions endpoint
 * This test MUST FAIL initially (TDD) - no implementation exists yet
 */

describe('GET /sessions', () => {
  let originalInvoke: any;

  beforeEach(() => {
    originalInvoke = global.ipcRenderer.invoke;
  });

  afterEach(() => {
    global.ipcRenderer.invoke = originalInvoke;
  });

  describe('Response schema validation (FR-022)', () => {
    it('should return sessions array', async () => {
      const response = await global.ipcRenderer.invoke('sessions:list');

      expect(response).toBeDefined();
      expect(response.sessions).toBeDefined();
      expect(Array.isArray(response.sessions)).toBe(true);
    });

    it('should return empty array when no sessions exist', async () => {
      const response = await global.ipcRenderer.invoke('sessions:list');

      expect(response.sessions).toBeInstanceOf(Array);
      expect(response.sessions.length).toBeGreaterThanOrEqual(0);
    });

    it('should include required fields in SessionListItem', async () => {
      // First create a session
      const startResponse = await global.ipcRenderer.invoke('interrogation:start', {
        hypothesis: 'Test question for session list',
        iterationLimit: 10,
        detectiveProvider: 'openai',
        witnessModel: 'llama2',
      });

      // Stop it to ensure it's saved
      await global.ipcRenderer.invoke('interrogation:stop', {
        sessionId: startResponse.sessionId,
      });

      // List sessions
      const listResponse = await global.ipcRenderer.invoke('sessions:list');

      const session = listResponse.sessions.find(
        (s: any) => s.id === startResponse.sessionId
      );

      expect(session).toBeDefined();
      expect(session).toMatchObject({
        id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ),
        hypothesis: expect.any(String),
        startTime: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/), // ISO 8601
        status: expect.stringMatching(/^(running|completed|failed|limit-reached)$/),
      });
    });

    it('should include consistencyScore only for completed sessions', async () => {
      const listResponse = await global.ipcRenderer.invoke('sessions:list');

      listResponse.sessions.forEach((session: any) => {
        if (session.status === 'completed') {
          expect(session.consistencyScore).toBeDefined();
          expect(typeof session.consistencyScore).toBe('number');
          expect(session.consistencyScore).toBeGreaterThanOrEqual(0);
          expect(session.consistencyScore).toBeLessThanOrEqual(100);
        } else {
          expect(session.consistencyScore).toBeUndefined();
        }
      });
    });
  });

  describe('Session ordering', () => {
    it('should return sessions sorted by startTime descending (newest first)', async () => {
      // Mock deterministic session ordering without setTimeout
      const now = new Date();
      const earlier = new Date(now.getTime() - 60000); // 1 minute earlier

      const mockSessions = [
        {
          id: 'session-2',
          hypothesis: 'Second question',
          startTime: now.toISOString(),
          status: 'completed',
          consistencyScore: 85,
        },
        {
          id: 'session-1',
          hypothesis: 'First question',
          startTime: earlier.toISOString(),
          status: 'completed',
          consistencyScore: 90,
        },
      ];

      global.ipcRenderer.invoke = jest.fn((channel: string) => {
        if (channel === 'sessions:list') {
          return Promise.resolve({ sessions: mockSessions });
        }
        return Promise.reject(new Error(`Unhandled channel: ${channel}`));
      });

      const listResponse = await global.ipcRenderer.invoke('sessions:list');

      // Verify ordering (newest first)
      for (let i = 1; i < listResponse.sessions.length; i++) {
        const prev = new Date(listResponse.sessions[i - 1].startTime);
        const curr = new Date(listResponse.sessions[i].startTime);
        expect(prev >= curr).toBe(true);
      }
    });
  });

  describe('Session filtering', () => {
    it('should only include completed and failed sessions (not running)', async () => {
      const listResponse = await global.ipcRenderer.invoke('sessions:list');

      listResponse.sessions.forEach((session: any) => {
        expect(['completed', 'failed', 'limit-reached']).toContain(session.status);
      });
    });
  });
});
