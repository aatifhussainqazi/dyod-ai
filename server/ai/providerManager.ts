import { GeminiProvider } from './geminiProvider';
import { NvidiaEvaluationProvider } from './nvidiaEvaluationProvider';

export class ProviderManager {
  private geminiProvider: GeminiProvider;
  private nvidiaEvalProvider: NvidiaEvaluationProvider;

  constructor() {
    this.geminiProvider = new GeminiProvider();
    this.nvidiaEvalProvider = new NvidiaEvaluationProvider();
  }

  public async generateChatAnswer(
    systemPrompt: string,
    userPrompt: string,
    history: Array<{ sender: 'user' | 'assistant'; content: string }> = []
  ): Promise<{ answer: string; provider: string; model: string }> {
    // Primary provider is Google Gemini Free Tier
    try {
      const result = await this.geminiProvider.generateAnswer(
        systemPrompt,
        userPrompt,
        history
      );
      return {
        answer: result.text,
        provider: 'gemini-free-tier',
        model: this.geminiProvider.getModelName(),
      };
    } catch (err: any) {
      // STRICT REQUIREMENT 4.6: NO PAID FALLBACK
      // If Gemini fails or hits quota, do NOT fall back to paid or external APIs.
      if (err.isQuotaError || (err.message && err.message.toLowerCase().includes('quota'))) {
        throw new Error(
          'The DYOD AI service has temporarily reached its free usage limit. Please try again later.'
        );
      }
      throw err;
    }
  }

  public getPrimaryModelName(): string {
    return this.geminiProvider.getModelName();
  }

  public isNvidiaEvaluationEnabled(): boolean {
    return this.nvidiaEvalProvider.isAvailable();
  }

  public getNvidiaEvaluationProvider(): NvidiaEvaluationProvider {
    return this.nvidiaEvalProvider;
  }
}
