/**
 * Integration test: Detective (OpenAI) interrogates Witness
 * Tests the full interrogation flow with OpenAI GPT-4o-mini
 */

import * as dotenv from 'dotenv';
import { DetectiveAgent } from '../../src/agents/DetectiveAgent';
import { WitnessAgent } from '../../src/agents/WitnessAgent';

// Load environment variables
dotenv.config();

describe('Detective-Witness Interrogation (OpenAI)', () => {
  it(
    'should extract information about alcohol and nutrients using OpenAI',
    async () => {
      // Setup Witness (AnythingLLM with optimized settings)
      // Require real credentials for AnythingLLM; skip test if not provided
      if (!process.env.ANYTHINGLLM_API_KEY || !process.env.WITNESS_WORKSPACE_SLUG) {
        console.log('Skipping test: ANYTHINGLLM_API_KEY and WITNESS_WORKSPACE_SLUG required');
        return;
      }

      const witness = new WitnessAgent({
        apiKey: process.env.ANYTHINGLLM_API_KEY,
        baseUrl: process.env.ANYTHINGLLM_BASE_URL || 'http://localhost:3001',
        workspaceSlug: process.env.WITNESS_WORKSPACE_SLUG,
      });

      // Setup Detective with OpenAI GPT-4o-mini
      const detective = new DetectiveAgent({
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        initialStrategy: 'depth-first',
      });

      // Run interrogation
      const result = await detective.interrogate(
        'Was passiert, wenn ein Mensch Alkohol konsumiert?',
        witness,
        5 // Max 5 iterations for test
      );

      // Assertions
      expect(result.findings).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.conversationHistory.length).toBeGreaterThan(0);

      // Log results for inspection
      console.log('\n=== INTERROGATION RESULTS (OpenAI) ===');
      console.log('Findings:', result.findings);
      console.log('\nConversation:');
      result.conversationHistory.forEach((turn, i) => {
        console.log(`\n[${i + 1}] Q: ${turn.question}`);
        console.log(`    A: ${turn.answer.substring(0, 100)}...`);
        console.log(`    Strategy: ${turn.strategy}`);
        console.log(`    Findings: ${turn.findings.join(', ')}`);
      });
    },
    600000 // 10 minute timeout (multiple LLM calls)
  );
});
