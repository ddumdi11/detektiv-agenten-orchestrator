/**
 * T012: Contract test for PUT /config/timeouts endpoint
 * This test MUST FAIL initially (TDD) - no implementation exists yet
 */

describe('PUT /config/timeouts', () => {
  describe('Request validation (FR-034, FR-035)', () => {
    it('should accept valid timeout configuration', async () => {
      const response = await global.ipcRenderer.invoke('config:updateTimeouts', {
        cloudTimeout: 60,
        localTimeout: 180,
      });

      expect(response).toEqual({ status: 'success' });
    });

    it('should reject missing cloudTimeout', async () => {
      await expect(
        global.ipcRenderer.invoke('config:updateTimeouts', {
          localTimeout: 180,
        })
      ).rejects.toThrow(/cloudTimeout.*required/i);
    });

    it('should reject missing localTimeout', async () => {
      await expect(
        global.ipcRenderer.invoke('config:updateTimeouts', {
          cloudTimeout: 60,
        })
      ).rejects.toThrow(/localTimeout.*required/i);
    });
  });

  describe('Cloud timeout validation (FR-034)', () => {
    it('should accept minimum cloud timeout (15 seconds)', async () => {
      const response = await global.ipcRenderer.invoke('config:updateTimeouts', {
        cloudTimeout: 15,
        localTimeout: 180,
      });

      expect(response.status).toBe('success');
    });

    it('should accept maximum cloud timeout (120 seconds)', async () => {
      const response = await global.ipcRenderer.invoke('config:updateTimeouts', {
        cloudTimeout: 120,
        localTimeout: 180,
      });

      expect(response.status).toBe('success');
    });

    it('should reject cloud timeout below minimum (< 15)', async () => {
      await expect(
        global.ipcRenderer.invoke('config:updateTimeouts', {
          cloudTimeout: 10,
          localTimeout: 180,
        })
      ).rejects.toThrow(/cloudTimeout.*minimum.*15/i);
    });

    it('should reject cloud timeout above maximum (> 120)', async () => {
      await expect(
        global.ipcRenderer.invoke('config:updateTimeouts', {
          cloudTimeout: 150,
          localTimeout: 180,
        })
      ).rejects.toThrow(/cloudTimeout.*maximum.*120/i);
    });

    it('should reject non-integer cloud timeout', async () => {
      await expect(
        global.ipcRenderer.invoke('config:updateTimeouts', {
          cloudTimeout: 60.5,
          localTimeout: 180,
        })
      ).rejects.toThrow(/cloudTimeout.*integer/i);
    });
  });

  describe('Local timeout validation (FR-035)', () => {
    it('should accept minimum local timeout (15 seconds)', async () => {
      const response = await global.ipcRenderer.invoke('config:updateTimeouts', {
        cloudTimeout: 60,
        localTimeout: 15,
      });

      expect(response.status).toBe('success');
    });

    it('should accept maximum local timeout (360 seconds)', async () => {
      const response = await global.ipcRenderer.invoke('config:updateTimeouts', {
        cloudTimeout: 60,
        localTimeout: 360,
      });

      expect(response.status).toBe('success');
    });

    it('should reject local timeout below minimum (< 15)', async () => {
      await expect(
        global.ipcRenderer.invoke('config:updateTimeouts', {
          cloudTimeout: 60,
          localTimeout: 10,
        })
      ).rejects.toThrow(/localTimeout.*minimum.*15/i);
    });

    it('should reject local timeout above maximum (> 360)', async () => {
      await expect(
        global.ipcRenderer.invoke('config:updateTimeouts', {
          cloudTimeout: 60,
          localTimeout: 400,
        })
      ).rejects.toThrow(/localTimeout.*maximum.*360/i);
    });

    it('should reject non-integer local timeout', async () => {
      await expect(
        global.ipcRenderer.invoke('config:updateTimeouts', {
          cloudTimeout: 60,
          localTimeout: 180.7,
        })
      ).rejects.toThrow(/localTimeout.*integer/i);
    });
  });

  describe('Persistence', () => {
    it('should persist timeout configuration across sessions', async () => {
      await global.ipcRenderer.invoke('config:updateTimeouts', {
        cloudTimeout: 90,
        localTimeout: 240,
      });

      // Simulate restart by reloading config
      const config = await global.ipcRenderer.invoke('config:load');

      expect(config.timeouts).toMatchObject({
        cloud: 90,
        local: 240,
      });
    });

    it('should allow updating timeouts multiple times', async () => {
      await global.ipcRenderer.invoke('config:updateTimeouts', {
        cloudTimeout: 30,
        localTimeout: 120,
      });

      await global.ipcRenderer.invoke('config:updateTimeouts', {
        cloudTimeout: 60,
        localTimeout: 240,
      });

      const config = await global.ipcRenderer.invoke('config:load');

      expect(config.timeouts).toMatchObject({
        cloud: 60,
        local: 240,
      });
    });
  });

  describe('Default values', () => {
    it('should have reasonable default timeouts on first launch', async () => {
      const config = await global.ipcRenderer.invoke('config:load');

      expect(config.timeouts).toBeDefined();
      expect(config.timeouts.cloud).toBeGreaterThanOrEqual(15);
      expect(config.timeouts.cloud).toBeLessThanOrEqual(120);
      expect(config.timeouts.local).toBeGreaterThanOrEqual(15);
      expect(config.timeouts.local).toBeLessThanOrEqual(360);
    });
  });
});
