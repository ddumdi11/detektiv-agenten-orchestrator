/**
 * Detective Agent - Interrogates Witness Agent using adaptive questioning strategies
 * Uses LLM (OpenAI/Anthropic/Gemini) to intelligently extract information
 */

import Anthropic from '@anthropic-ai/sdk';

export type QuestioningStrategy =
  | 'breadth-first'    // Get overview of all aspects
  | 'depth-first'      // Deep dive into specific topic
  | 'contradiction'    // Find inconsistencies with general knowledge
  | 'timeline';        // Extract chronological sequence

export interface DetectiveConfig {
  provider: 'openai' | 'anthropic' | 'gemini';
  apiKey: string;
  model: string;
  initialStrategy?: QuestioningStrategy;
}

export interface ConversationTurn {
  question: string;
  answer: string;
  strategy: QuestioningStrategy;
  findings: string[];  // Key facts extracted
  curiosityTriggers: string[];  // New topics to explore
}

export class DetectiveAgent {
  private config: DetectiveConfig;
  private conversationHistory: ConversationTurn[] = [];
  private currentStrategy: QuestioningStrategy;
  private anthropic?: Anthropic;

  constructor(config: DetectiveConfig) {
    this.config = config;
    this.currentStrategy = config.initialStrategy || 'breadth-first';

    // Initialize Anthropic client if using anthropic provider
    if (config.provider === 'anthropic') {
      this.anthropic = new Anthropic({
        apiKey: config.apiKey,
      });
    }
  }

  /**
   * Start interrogation with initial hypothesis/question
   */
  async interrogate(
    hypothesis: string,
    witness: { ask: (question: string) => Promise<string> },
    maxIterations: number = 10
  ): Promise<{
    findings: string[];
    conversationHistory: ConversationTurn[];
    finalStrategy: QuestioningStrategy;
  }> {
    let iteration = 0;
    const allFindings: string[] = [];

    // Initial question based on hypothesis
    let currentQuestion = await this.generateInitialQuestion(hypothesis);

    while (iteration < maxIterations) {
      console.log(`\n[Detective] Iteration ${iteration + 1}/${maxIterations}`);
      console.log(`[Strategy] ${this.currentStrategy}`);
      console.log(`[Question] ${currentQuestion}`);

      // Ask witness
      const answer = await witness.ask(currentQuestion);
      console.log(`[Answer] ${answer.substring(0, 150)}...`);

      // Analyze answer
      const analysis = await this.analyzeAnswer(currentQuestion, answer);

      // Store turn
      const turn: ConversationTurn = {
        question: currentQuestion,
        answer,
        strategy: this.currentStrategy,
        findings: analysis.findings,
        curiosityTriggers: analysis.curiosityTriggers,
      };
      this.conversationHistory.push(turn);
      allFindings.push(...analysis.findings);

      // Decide next move (strategy switch or continue)
      const nextMove = await this.decideNextMove(analysis);

      if (nextMove.shouldStop) {
        console.log('[Detective] Investigation complete!');
        break;
      }

      if (nextMove.newStrategy) {
        console.log(`[Strategy Switch] ${this.currentStrategy} → ${nextMove.newStrategy}`);
        this.currentStrategy = nextMove.newStrategy;
      }

      currentQuestion = nextMove.nextQuestion;
      iteration++;
    }

    return {
      findings: allFindings,
      conversationHistory: this.conversationHistory,
      finalStrategy: this.currentStrategy,
    };
  }

  /**
   * Generate initial question based on hypothesis and strategy
   */
  private async generateInitialQuestion(hypothesis: string): Promise<string> {
    // If using depth-first and hypothesis is already a question, use it directly
    if (this.currentStrategy === 'depth-first' && hypothesis.includes('?')) {
      return hypothesis;
    }

    const strategyPrompts = {
      'breadth-first': `Given the topic/question: "${hypothesis}"

Ask a broad question to get an overview of all main aspects. Return ONLY the question in the same language as the topic, nothing else.`,
      'depth-first': `Given the topic/question: "${hypothesis}"

Ask a specific question to dive deep into one aspect. Return ONLY the question in the same language as the topic, nothing else.`,
      'contradiction': `Given the topic/question: "${hypothesis}"

Ask a question where you expect specific factual information that can be verified. Return ONLY the question in the same language as the topic, nothing else.`,
      'timeline': `Given the topic/question: "${hypothesis}"

Ask about the sequence, process, or timeline of what happens. Return ONLY the question in the same language as the topic, nothing else.`,
    };

    if (this.anthropic) {
      const message = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: strategyPrompts[this.currentStrategy],
          },
        ],
      });

      const textContent = message.content.find((block) => block.type === 'text');
      if (textContent && textContent.type === 'text') {
        return textContent.text.trim();
      }
    }

    // Fallback if LLM not available
    switch (this.currentStrategy) {
      case 'breadth-first':
        return `What are the main aspects of this topic?`;
      case 'depth-first':
        return hypothesis;
      case 'contradiction':
        return `What specific facts are mentioned about this?`;
      case 'timeline':
        return `What is the sequence or process described?`;
    }
  }

  /**
   * Analyze witness answer for findings and curiosity triggers
   */
  private async analyzeAnswer(
    question: string,
    answer: string
  ): Promise<{
    findings: string[];
    curiosityTriggers: string[];
  }> {
    if (this.anthropic) {
      const analysisPrompt = `You are a detective analyzing a witness's answer. Extract key facts and identify interesting topics for follow-up questions.

Question asked: "${question}"
Witness answer: "${answer}"

Analyze this answer and provide:
1. Key findings: Concrete facts, statements, or claims made by the witness (list each as a bullet point)
2. Curiosity triggers: Interesting topics, gaps, or ambiguities that warrant follow-up questions (list each as a bullet point)

Format your response as:
FINDINGS:
- [fact 1]
- [fact 2]
...

CURIOSITY:
- [topic 1]
- [topic 2]
...

If the witness says information is not in the document or refuses to answer, note this as a finding.`;

      const message = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
      });

      const textContent = message.content.find((block) => block.type === 'text');
      if (textContent && textContent.type === 'text') {
        const analysisText = textContent.text;

        // Parse findings and curiosity triggers
        const findings: string[] = [];
        const curiosityTriggers: string[] = [];

        const findingsMatch = analysisText.match(/FINDINGS:\s*([\s\S]*?)(?=CURIOSITY:|$)/i);
        if (findingsMatch) {
          const findingsText = findingsMatch[1];
          const findingLines = findingsText
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.startsWith('-'))
            .map((line) => line.substring(1).trim());
          findings.push(...findingLines);
        }

        const curiosityMatch = analysisText.match(/CURIOSITY:\s*([\s\S]*?)$/i);
        if (curiosityMatch) {
          const curiosityText = curiosityMatch[1];
          const curiosityLines = curiosityText
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.startsWith('-'))
            .map((line) => line.substring(1).trim());
          curiosityTriggers.push(...curiosityLines);
        }

        return { findings, curiosityTriggers };
      }
    }

    // Fallback: simple keyword detection
    const findings: string[] = [];
    const curiosityTriggers: string[] = [];

    if (answer.toLowerCase().includes('not in the document') || answer.toLowerCase().includes('nicht im dokument')) {
      findings.push('Witness states information is not in the document');
      curiosityTriggers.push('Try rephrasing or asking about related topics');
    }

    // Extract key phrases (simplified)
    if (answer.toLowerCase().includes('nährstoff')) {
      findings.push('Mentions nutrients (Nährstoffe)');
      curiosityTriggers.push('Which specific nutrients?');
    }
    if (answer.toLowerCase().includes('raub') || answer.toLowerCase().includes('verbrauch')) {
      findings.push('Mentions consumption/depletion');
      curiosityTriggers.push('How exactly are they consumed?');
    }
    if (answer.toLowerCase().includes('stoffwechsel')) {
      findings.push('Mentions metabolism (Stoffwechsel)');
      curiosityTriggers.push('How does metabolism change?');
    }

    return { findings, curiosityTriggers };
  }

  /**
   * Decide next move: continue, switch strategy, or stop
   */
  private async decideNextMove(analysis: {
    findings: string[];
    curiosityTriggers: string[];
  }): Promise<{
    shouldStop: boolean;
    newStrategy?: QuestioningStrategy;
    nextQuestion: string;
  }> {
    // If we have curiosity triggers, follow up
    if (analysis.curiosityTriggers.length > 0) {
      return {
        shouldStop: false,
        nextQuestion: analysis.curiosityTriggers[0], // Ask first trigger
      };
    }

    // No more curiosity - switch strategy or stop
    const strategyCycle: QuestioningStrategy[] = [
      'breadth-first',
      'depth-first',
      'contradiction',
      'timeline',
    ];

    const currentIndex = strategyCycle.indexOf(this.currentStrategy);
    const nextIndex = (currentIndex + 1) % strategyCycle.length;

    if (nextIndex === 0) {
      // Completed full cycle
      return {
        shouldStop: true,
        nextQuestion: '',
      };
    }

    return {
      shouldStop: false,
      newStrategy: strategyCycle[nextIndex],
      nextQuestion: 'Tell me more about the details.',
    };
  }
}
