/**
 * Unit tests for Witness Agent
 * Tests the AnythingLLM integration for answering questions
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

describe('WitnessAgent', () => {
  describe('Basic functionality', () => {
    it(
      'should answer a simple question',
      async () => {
        // Skip test if environment variables not set
        if (!process.env.ANYTHINGLLM_API_KEY || !process.env.WITNESS_WORKSPACE_SLUG) {
          console.warn('Skipping test: ANYTHINGLLM_API_KEY or WITNESS_WORKSPACE_SLUG not set');
          return;
        }

        // Arrange
        const { WitnessAgent } = await import('../../../src/agents/WitnessAgent');

        const agent = new WitnessAgent({
          apiKey: process.env.ANYTHINGLLM_API_KEY,
          baseUrl: process.env.ANYTHINGLLM_BASE_URL || 'http://localhost:3001',
          workspaceSlug: process.env.WITNESS_WORKSPACE_SLUG,
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

    it('should throw error if API key is missing', async () => {
      const { WitnessAgent } = await import('../../../src/agents/WitnessAgent');

      expect(() => {
        new WitnessAgent({
          apiKey: '',
          baseUrl: 'http://localhost:3001',
          workspaceSlug: 'test',
        });
      }).toThrow(/apiKey.*required/i);
    });

    it('should throw error if workspace slug is missing', async () => {
      const { WitnessAgent } = await import('../../../src/agents/WitnessAgent');

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
      // Skip test if environment not set up
      if (!process.env.ANYTHINGLLM_BASE_URL || !process.env.WITNESS_WORKSPACE_SLUG) {
        console.warn('Skipping test: Environment variables not set');
        return;
      }

      const { WitnessAgent } = await import('../../../src/agents/WitnessAgent');

      const agent = new WitnessAgent({
        apiKey: 'invalid-key-12345',
        baseUrl: process.env.ANYTHINGLLM_BASE_URL,
        workspaceSlug: process.env.WITNESS_WORKSPACE_SLUG,
      });

      await expect(agent.ask('Test question')).rejects.toThrow(/unauthorized|401/i);
    });
  });
});
