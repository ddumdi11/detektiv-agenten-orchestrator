/**
 * Integration test: Detective interrogates Witness
 * Tests the full interrogation flow with real AnythingLLM
 */

import * as dotenv from 'dotenv';
import { DetectiveAgent } from '../../src/agents/DetectiveAgent';
import { WitnessAgent } from '../../src/agents/WitnessAgent';

// Load environment variables
dotenv.config();

describe('Detective-Witness Interrogation', () => {
  it(
    'should extract information about alcohol and nutrients',
    async () => {
      // Setup Witness (AnythingLLM with optimized settings)
      const witness = new WitnessAgent({
        apiKey: process.env.ANYTHINGLLM_API_KEY || 'YX8K6D2-C8X4BZ6-JMXX9PG-2RXC8PB',
        baseUrl: process.env.ANYTHINGLLM_BASE_URL || 'http://localhost:3001',
        workspaceSlug: process.env.WITNESS_WORKSPACE_SLUG || 'mynearlydryottobretrial',
      });

      // Setup Detective with Anthropic Claude
      const detective = new DetectiveAgent({
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        model: 'claude-3-5-sonnet-20241022',
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
      console.log('\n=== INTERROGATION RESULTS ===');
      console.log('Findings:', result.findings);
      console.log('\nConversation:');
      result.conversationHistory.forEach((turn, i) => {
        console.log(`\n[${i + 1}] Q: ${turn.question}`);
        console.log(`    A: ${turn.answer.substring(0, 100)}...`);
        console.log(`    Strategy: ${turn.strategy}`);
        console.log(`    Findings: ${turn.findings.join(', ')}`);
      });
    },
    300000 // 5 minute timeout (multiple LLM calls)
  );
});
