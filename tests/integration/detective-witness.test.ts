/**
 * Integration test: Detective interrogates Witness
 * Tests the full interrogation flow with real AnythingLLM
 */

import { DetectiveAgent } from '../../src/agents/DetectiveAgent';
import { WitnessAgent } from '../../src/agents/WitnessAgent';

describe('Detective-Witness Interrogation', () => {
  it(
    'should extract information about alcohol and nutrients',
    async () => {
      // Setup Witness (AnythingLLM with optimized settings)
      const witness = new WitnessAgent({
        apiKey: 'YX8K6D2-C8X4BZ6-JMXX9PG-2RXC8PB',
        baseUrl: 'http://localhost:3001',
        workspaceSlug: 'mynearlydryottobretrial',
      });

      // Setup Detective (using simple logic for now, will add LLM later)
      const detective = new DetectiveAgent({
        provider: 'openai', // TODO: Will be used when we add LLM integration
        apiKey: 'placeholder',
        model: 'gpt-4o',
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
