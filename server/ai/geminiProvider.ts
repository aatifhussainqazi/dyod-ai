export interface GeminiResponse {
  text: string;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export class GeminiProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxOutputTokens: number;

  constructor(apiKey?: string, model?: string, maxTokens?: number) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
    this.maxOutputTokens = maxTokens || parseInt(process.env.MAX_OUTPUT_TOKENS || '1200', 10);

    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY is not configured.');
    }
  }

  public async generateAnswer(
    systemInstruction: string,
    userPrompt: string,
    conversationHistory: Array<{ sender: 'user' | 'assistant'; content: string }> = []
  ): Promise<GeminiResponse> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    // Build contents array including recent conversation history
    const contents: any[] = [];

    // Include recent history (limit to last 4 turns to conserve context)
    const recentHistory = conversationHistory.slice(-4);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    // Append current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }],
    });

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents,
      generationConfig: {
        maxOutputTokens: this.maxOutputTokens,
        temperature: 0.2, // Low temperature for grounded academic retrieval
        topP: 0.95,
      },
    };

    // Retry loop with backoff for temporary 503 high-demand spikes
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          this.model
        )}:generateContent?key=${this.apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorJson: any = null;
          try {
            errorJson = JSON.parse(errorText);
          } catch {}

          const errorCode = response.status;
          const errorMessage = errorJson?.error?.message || errorText;

          // Free tier quota exhaustion
          if (errorCode === 429 || errorMessage.toLowerCase().includes('quota')) {
            const quotaError = new Error(
              'The DYOD AI service has temporarily reached its free usage limit. Please try again later.'
            );
            (quotaError as any).isQuotaError = true;
            (quotaError as any).statusCode = 429;
            throw quotaError;
          }

          // Retry on 503 temporary high demand
          if (errorCode === 503 && attempt < maxRetries) {
            console.warn(`Gemini 503 spike, retrying (attempt ${attempt + 1})...`);
            continue;
          }

          throw new Error(`Gemini API error (${errorCode}): ${errorMessage}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];

        if (!candidate) {
          throw new Error('No candidate response returned from Gemini.');
        }

        // Extract text part (handling models with thinking parts if present)
        let text = '';
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.text && !part.thought) {
              text += part.text;
            }
          }
          if (!text && candidate.content.parts.length > 0) {
            text = candidate.content.parts.map((p: any) => p.text || '').join('');
          }
        }

        return {
          text: text.trim(),
          finishReason: candidate.finishReason,
          usage: {
            promptTokens: data.usageMetadata?.promptTokenCount,
            completionTokens: data.usageMetadata?.candidatesTokenCount,
            totalTokens: data.usageMetadata?.totalTokenCount,
          },
        };
      } catch (err: any) {
        lastError = err;
        if (err.isQuotaError) {
          throw err;
        }
      }
    }

    throw lastError || new Error('Failed to generate response from Gemini Free Tier.');
  }

  public getModelName(): string {
    return this.model;
  }
}
