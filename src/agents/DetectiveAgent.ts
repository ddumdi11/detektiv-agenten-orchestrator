/**
 * Detective Agent - Interrogates Witness Agent using adaptive questioning strategies
 * Uses LLM (OpenAI/Anthropic/Gemini) to intelligently extract information
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

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
  language?: 'de' | 'en';
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
  private openai?: OpenAI;
  private language: 'de' | 'en';

  constructor(config: DetectiveConfig) {
    this.config = config;
    this.currentStrategy = config.initialStrategy || 'breadth-first';
    this.language = config.language || 'en';

    // Initialize LLM client based on provider
    if (config.provider === 'anthropic') {
      this.anthropic = new Anthropic({
        apiKey: config.apiKey,
      });
    } else if (config.provider === 'openai') {
      this.openai = new OpenAI({
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
    maxIterations: number = 10,
    abortSignal?: AbortSignal,
    onProgress?: (progress: {
      currentIteration: number;
      totalIterations: number;
      question: string;
      answer: string;
      findings: string[];
    }) => void
  ): Promise<{
    findings: string[];
    conversationHistory: ConversationTurn[];
    finalStrategy: QuestioningStrategy;
  }> {
    // Reset instance state for fresh interrogation
    this.conversationHistory = [];
    this.currentStrategy = this.config.initialStrategy || 'breadth-first';

    let iteration = 0;
    const allFindings: string[] = [];

    // Initial question based on hypothesis
    let currentQuestion = await this.generateInitialQuestion(hypothesis);

    while (iteration < maxIterations) {
      // Check if interrogation should be aborted
      if (abortSignal?.aborted) {
        console.log('[Detective] Stop signal received, aborting interrogation');
        break;
      }

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

      // Send progress update after each iteration
      if (onProgress) {
        onProgress({
          currentIteration: iteration + 1,
          totalIterations: maxIterations,
          question: currentQuestion,
          answer,
          findings: [...allFindings],
        });
      }

      // Decide next move (strategy switch or continue)
      const nextMove = await this.decideNextMove(analysis);

      if (nextMove.shouldStop) {
        console.log('[Detective] Investigation complete!');
        break;
      }

      if (nextMove.newStrategy) {
        console.log(`[Strategy Switch] ${this.currentStrategy} → ${nextMove.newStrategy}`);
        this.currentStrategy = nextMove.newStrategy;
        // Regenerate question for new strategy instead of using generic fallback
        currentQuestion = await this.generateInitialQuestion(hypothesis);
      } else {
        currentQuestion = nextMove.nextQuestion;
      }

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

    // Strategy prompts in both languages
    const strategyPromptsDE = {
      'breadth-first': `Gegeben ist das Thema/die Frage: "${hypothesis}"

Stelle eine breite Frage, um einen Überblick über alle Hauptaspekte zu erhalten. Gib NUR die Frage auf Deutsch zurück, sonst nichts.`,
      'depth-first': `Gegeben ist das Thema/die Frage: "${hypothesis}"

Stelle eine spezifische Frage, um tief in einen Aspekt einzutauchen. Gib NUR die Frage auf Deutsch zurück, sonst nichts.`,
      'contradiction': `Gegeben ist das Thema/die Frage: "${hypothesis}"

Stelle eine Frage, bei der du spezifische faktische Informationen erwartest, die überprüft werden können. Gib NUR die Frage auf Deutsch zurück, sonst nichts.`,
      'timeline': `Gegeben ist das Thema/die Frage: "${hypothesis}"

Frage nach der Abfolge, dem Prozess oder dem zeitlichen Ablauf. Gib NUR die Frage auf Deutsch zurück, sonst nichts.`,
    };

    const strategyPromptsEN = {
      'breadth-first': `Given the topic/question: "${hypothesis}"

Ask a broad question to get an overview of all main aspects. Return ONLY the question in English, nothing else.`,
      'depth-first': `Given the topic/question: "${hypothesis}"

Ask a specific question to dive deep into one aspect. Return ONLY the question in English, nothing else.`,
      'contradiction': `Given the topic/question: "${hypothesis}"

Ask a question where you expect specific factual information that can be verified. Return ONLY the question in English, nothing else.`,
      'timeline': `Given the topic/question: "${hypothesis}"

Ask about the sequence, process, or timeline of what happens. Return ONLY the question in English, nothing else.`,
    };

    const strategyPrompts = this.language === 'de' ? strategyPromptsDE : strategyPromptsEN;

    // Call LLM based on provider
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
    } else if (this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: strategyPrompts[this.currentStrategy],
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return content.trim();
      }
    }

    // Fallback if LLM not available - localized questions
    if (this.language === 'de') {
      switch (this.currentStrategy) {
        case 'breadth-first':
          return `Was sind die Hauptaspekte zu diesem Thema: ${hypothesis}?`;
        case 'depth-first':
          return hypothesis;
        case 'contradiction':
          return `Welche konkreten Fakten werden erwähnt zu: ${hypothesis}?`;
        case 'timeline':
          return `Welche Abfolge oder welcher Prozess wird beschrieben bei: ${hypothesis}?`;
      }
    } else {
      switch (this.currentStrategy) {
        case 'breadth-first':
          return `What are the main aspects of this topic: ${hypothesis}?`;
        case 'depth-first':
          return hypothesis;
        case 'contradiction':
          return `What specific facts are mentioned about: ${hypothesis}?`;
        case 'timeline':
          return `What is the sequence or process described in: ${hypothesis}?`;
      }
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
    const analysisPromptDE = `Du bist ein Detektiv, der eine Antwort analysiert. Extrahiere wichtige Fakten und identifiziere interessante Themen für Nachfragen.

Gestellte Frage: "${question}"
Erhaltene Antwort: "${answer}"

Analysiere diese Antwort und liefere:
1. Wichtige Erkenntnisse: Konkrete Fakten, Aussagen oder Behauptungen aus der Antwort (jeweils als Aufzählungspunkt)
2. Nachfrage-Trigger: Interessante Themen, Lücken oder Unklarheiten, die Nachfragen rechtfertigen (jeweils als Aufzählungspunkt)

WICHTIG: Formuliere Nachfragen als direkte Fragen, die sich auf den Dokumentinhalt beziehen, NICHT als Meta-Fragen über "den Zeugen".

Formatiere deine Antwort so:
ERKENNTNISSE:
- [Fakt 1]
- [Fakt 2]
...

NACHFRAGEN:
- [Direkte Frage zum Dokumentinhalt]
- [Weitere direkte Frage]
...

Beispiele für GUTE Nachfragen:
- "Welche anderen Vitamine werden im Dokument erwähnt?"
- "Wo im Text wird dieser Name genannt?"

Beispiele für SCHLECHTE Nachfragen (NIEMALS so formulieren):
- "Warum erwähnt der Zeuge...?" ❌
- "Woher kennt der Zeuge...?" ❌

Wenn die Antwort besagt, dass die Information nicht im Dokument ist, notiere dies als Erkenntnis.`;

    const analysisPromptEN = `You are a detective analyzing an answer. Extract key facts and identify interesting topics for follow-up questions.

Question asked: "${question}"
Answer received: "${answer}"

Analyze this answer and provide:
1. Key findings: Concrete facts, statements, or claims from the answer (list each as a bullet point)
2. Curiosity triggers: Interesting topics, gaps, or ambiguities that warrant follow-up questions (list each as a bullet point)

IMPORTANT: Formulate follow-up questions as direct questions about the document content, NOT as meta-questions about "the witness".

Format your response as:
FINDINGS:
- [fact 1]
- [fact 2]
...

CURIOSITY:
- [Direct question about document content]
- [Another direct question]
...

Examples of GOOD follow-up questions:
- "What other vitamins are mentioned in the document?"
- "Where in the text is this name mentioned?"

Examples of BAD follow-up questions (NEVER formulate like this):
- "Why does the witness mention...?" ❌
- "How does the witness know...?" ❌

If the answer states that information is not in the document, note this as a finding.`;

    const analysisPrompt = this.language === 'de' ? analysisPromptDE : analysisPromptEN;

    // Call LLM based on provider
    if (this.anthropic) {
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
        return this.parseAnalysisResponse(textContent.text);
      }
    } else if (this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: analysisPrompt,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        return this.parseAnalysisResponse(content);
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
   * Parse LLM analysis response into findings and curiosity triggers
   */
  private parseAnalysisResponse(analysisText: string): {
    findings: string[];
    curiosityTriggers: string[];
  } {
    const findings: string[] = [];
    const curiosityTriggers: string[] = [];

    // Support both English and German markers
    const findingsMatch = analysisText.match(/(?:FINDINGS|ERKENNTNISSE):\s*([\s\S]*?)(?=(?:CURIOSITY|NACHFRAGEN):|$)/i);
    if (findingsMatch) {
      const findingsText = findingsMatch[1];
      const findingLines = findingsText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('-'))
        .map((line) => line.substring(1).trim());
      findings.push(...findingLines);
    }

    const curiosityMatch = analysisText.match(/(?:CURIOSITY|NACHFRAGEN):\s*([\s\S]*?)$/i);
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

  /**
   * Decide next move: continue, switch strategy, or stop
   * Detects when stuck (repeated "not in document") and switches strategy
   */
  private async decideNextMove(analysis: {
    findings: string[];
    curiosityTriggers: string[];
  }): Promise<{
    shouldStop: boolean;
    newStrategy?: QuestioningStrategy;
    nextQuestion: string;
  }> {
    // Check if we're stuck (last 2 answers were "not in document")
    const isStuck = this.conversationHistory.length >= 2 &&
      this.conversationHistory.slice(-2).every(turn =>
        turn.answer.toLowerCase().includes('not in the document') ||
        turn.answer.toLowerCase().includes('nicht im dokument')
      );

    if (isStuck) {
      console.log('[Strategy Switch] Detected stuck pattern - switching strategy');
      return this.switchToNextStrategy();
    }

    // If we have curiosity triggers, follow up
    if (analysis.curiosityTriggers.length > 0) {
      return {
        shouldStop: false,
        nextQuestion: analysis.curiosityTriggers[0], // Ask first trigger
      };
    }

    // No more curiosity - switch strategy or stop
    return this.switchToNextStrategy();
  }

  /**
   * Switch to the next questioning strategy in the cycle
   */
  private switchToNextStrategy(): {
    shouldStop: boolean;
    newStrategy?: QuestioningStrategy;
    nextQuestion: string;
  } {
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

    const defaultQuestion = this.language === 'de'
      ? 'Erzähl mir mehr über die Details.'
      : 'Tell me more about the details.';

    return {
      shouldStop: false,
      newStrategy: strategyCycle[nextIndex],
      nextQuestion: defaultQuestion,
    };
  }
}
