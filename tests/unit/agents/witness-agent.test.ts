/**
 * Unit tests for Witness Agent
 * Tests the AnythingLLM integration for answering questions
 */

describe('WitnessAgent', () => {
  describe('Basic functionality', () => {
    it(
      'should answer a simple question',
      async () => {
        // Arrange
        const { WitnessAgent } = await import('../../../src/agents/WitnessAgent');

        const agent = new WitnessAgent({
          apiKey: 'YX8K6D2-C8X4BZ6-JMXX9PG-2RXC8PB',
          baseUrl: 'http://localhost:3001',
          workspaceSlug: 'mynearlydryottobretrial',
        });

        // Act
        const response = await agent.ask('What is this document about?');

        // Assert
        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
      },
      300000
    ); // 5 minute timeout for local LLM response

    it('should throw error if API key is missing', () => {
      const { WitnessAgent } = require('../../../src/agents/WitnessAgent');

      expect(() => {
        new WitnessAgent({
          apiKey: '',
          baseUrl: 'http://localhost:3001',
          workspaceSlug: 'test',
        });
      }).toThrow(/apiKey.*required/i);
    });

    it('should throw error if workspace slug is missing', () => {
      const { WitnessAgent } = require('../../../src/agents/WitnessAgent');

      expect(() => {
        new WitnessAgent({
          apiKey: 'test-key',
          baseUrl: 'http://localhost:3001',
          workspaceSlug: '',
        });
      }).toThrow(/workspaceSlug.*required/i);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      const { WitnessAgent } = await import('../../../src/agents/WitnessAgent');

      const agent = new WitnessAgent({
        apiKey: 'test-key',
        baseUrl: 'http://localhost:9999', // Non-existent port
        workspaceSlug: 'test',
      });

      await expect(agent.ask('Test question')).rejects.toThrow();
    });

    it('should handle invalid API key', async () => {
      const { WitnessAgent } = await import('../../../src/agents/WitnessAgent');

      const agent = new WitnessAgent({
        apiKey: 'invalid-key-12345',
        baseUrl: 'http://localhost:3001',
        workspaceSlug: 'mynearlydryottobretrial',
      });

      await expect(agent.ask('Test question')).rejects.toThrow(/unauthorized|401/i);
    });
  });
});
