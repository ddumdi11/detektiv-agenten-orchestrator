/**
 * T011: Contract test for PUT /config/credentials endpoint
 * This test MUST FAIL initially (TDD) - no implementation exists yet
 */

describe('PUT /config/credentials', () => {
  describe('Request validation (FR-030, FR-032)', () => {
    it('should accept valid credentials for OpenAI', async () => {
      const response = await global.ipcRenderer.invoke('config:updateCredentials', {
        provider: 'openai',
        apiKey: 'sk-test1234567890abcdefghijklmnopqrstuvwxyz',
        model: 'gpt-4o',
        isDefault: true,
      });

      expect(response).toEqual({ status: 'success' });
    });

    it('should accept valid credentials for Anthropic', async () => {
      const response = await global.ipcRenderer.invoke('config:updateCredentials', {
        provider: 'anthropic',
        apiKey: 'sk-ant-test1234567890abcdefghijklmnopqr',
        model: 'claude-sonnet-4-5',
        isDefault: false,
      });

      expect(response.status).toBe('success');
    });

    it('should accept valid credentials for Gemini', async () => {
      const response = await global.ipcRenderer.invoke('config:updateCredentials', {
        provider: 'gemini',
        apiKey: 'AIzaSy-test1234567890abcdefghijklmnop',
        model: 'gemini-2.0-flash-exp',
        isDefault: false,
      });

      expect(response.status).toBe('success');
    });

    it('should reject missing provider', async () => {
      await expect(
        global.ipcRenderer.invoke('config:updateCredentials', {
          apiKey: 'sk-test1234567890abcdefghijklmnopqrstuvwxyz',
          model: 'gpt-4o',
        })
      ).rejects.toThrow(/provider.*required/i);
    });

    it('should reject invalid provider', async () => {
      await expect(
        global.ipcRenderer.invoke('config:updateCredentials', {
          provider: 'invalid-provider',
          apiKey: 'sk-test1234567890abcdefghijklmnopqrstuvwxyz',
          model: 'some-model',
        })
      ).rejects.toThrow(/provider.*invalid/i);
    });

    it('should reject API key shorter than 20 characters', async () => {
      await expect(
        global.ipcRenderer.invoke('config:updateCredentials', {
          provider: 'openai',
          apiKey: 'sk-short',
          model: 'gpt-4o',
        })
      ).rejects.toThrow(/apiKey.*minLength.*20/i);
    });

    it('should reject missing model', async () => {
      await expect(
        global.ipcRenderer.invoke('config:updateCredentials', {
          provider: 'openai',
          apiKey: 'sk-test1234567890abcdefghijklmnopqrstuvwxyz',
        })
      ).rejects.toThrow(/model.*required/i);
    });
  });

  describe('Credential validation (FR-005)', () => {
    it('should validate credentials before storing', async () => {
      // Invalid API key should be rejected during validation
      await expect(
        global.ipcRenderer.invoke('config:updateCredentials', {
          provider: 'openai',
          apiKey: 'sk-invalid1234567890abcdefghijklmnopqrstuvwxyz',
          model: 'gpt-4o',
        })
      ).rejects.toThrow(/validation failed|invalid.*key/i);
    });
  });

  describe('Credential encryption (FR-030)', () => {
    it('should encrypt API keys before storage', async () => {
      const testKey = 'sk-test1234567890abcdefghijklmnopqrstuvwxyz';

      await global.ipcRenderer.invoke('config:updateCredentials', {
        provider: 'openai',
        apiKey: testKey,
        model: 'gpt-4o',
      });

      // Read raw config file to verify encryption
      const configPath = await global.ipcRenderer.invoke('config:getPath');
      const fs = require('fs');
      const rawConfig = fs.readFileSync(configPath, 'utf8');

      // API key should NOT appear in plain text
      expect(rawConfig).not.toContain(testKey);
    });
  });

  describe('Default provider management', () => {
    it('should set provider as default when isDefault=true', async () => {
      await global.ipcRenderer.invoke('config:updateCredentials', {
        provider: 'anthropic',
        apiKey: 'sk-ant-test1234567890abcdefghijklmnopqr',
        model: 'claude-sonnet-4-5',
        isDefault: true,
      });

      const defaultProvider = await global.ipcRenderer.invoke('config:getDefaultDetective');

      expect(defaultProvider).toBe('anthropic');
    });

    it('should replace previous default when new default is set', async () => {
      // Set first default
      await global.ipcRenderer.invoke('config:updateCredentials', {
        provider: 'openai',
        apiKey: 'sk-test1234567890abcdefghijklmnopqrstuvwxyz',
        model: 'gpt-4o',
        isDefault: true,
      });

      // Set new default
      await global.ipcRenderer.invoke('config:updateCredentials', {
        provider: 'gemini',
        apiKey: 'AIzaSy-test1234567890abcdefghijklmnop',
        model: 'gemini-2.0-flash-exp',
        isDefault: true,
      });

      const defaultProvider = await global.ipcRenderer.invoke('config:getDefaultDetective');

      expect(defaultProvider).toBe('gemini');
    });

    it('should allow updating existing provider without changing default', async () => {
      await global.ipcRenderer.invoke('config:updateCredentials', {
        provider: 'openai',
        apiKey: 'sk-test-old1234567890abcdefghijklmnopqrstuvwxyz',
        model: 'gpt-4o',
        isDefault: true,
      });

      // Update same provider with new key, isDefault=false
      await global.ipcRenderer.invoke('config:updateCredentials', {
        provider: 'openai',
        apiKey: 'sk-test-new1234567890abcdefghijklmnopqrstuvwxyz',
        model: 'gpt-4o-mini',
        isDefault: false,
      });

      // Should still be default since it was already default
      const defaultProvider = await global.ipcRenderer.invoke('config:getDefaultDetective');
      expect(defaultProvider).toBe('openai');
    });
  });
});
