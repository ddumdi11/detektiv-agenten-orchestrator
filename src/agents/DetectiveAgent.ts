/**
 * Detective Agent - Interrogates Witness Agent using adaptive questioning strategies
 * Uses LLM (OpenAI/Anthropic/Gemini) to intelligently extract information
 */

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

  constructor(config: DetectiveConfig) {
    this.config = config;
    this.currentStrategy = config.initialStrategy || 'breadth-first';
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
    const strategyPrompts = {
      'breadth-first': `Given the topic "${hypothesis}", ask a broad question to get an overview of all main aspects.`,
      'depth-first': `Given the topic "${hypothesis}", ask a specific question to dive deep into one aspect.`,
      'contradiction': `Given the topic "${hypothesis}", ask a question where you expect specific factual information.`,
      'timeline': `Given the topic "${hypothesis}", ask about the sequence or process of what happens.`,
    };

    const prompt = `${strategyPrompts[this.currentStrategy]}

Return ONLY the question, nothing else.`;

    // TODO: Call LLM API (OpenAI/Anthropic/Gemini)
    // For now, return simple question based on strategy
    switch (this.currentStrategy) {
      case 'breadth-first':
        return `What are the main aspects of "${hypothesis}"?`;
      case 'depth-first':
        return `What happens during "${hypothesis}"?`;
      case 'contradiction':
        return `What specific effects does "${hypothesis}" have?`;
      case 'timeline':
        return `What is the sequence of events in "${hypothesis}"?`;
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
    // TODO: Use LLM to extract key facts and identify interesting follow-ups
    // For now, simple keyword detection
    const findings: string[] = [];
    const curiosityTriggers: string[] = [];

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
