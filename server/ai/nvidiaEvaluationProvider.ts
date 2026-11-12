export class NvidiaEvaluationProvider {
  private readonly apiKey: string;
  private readonly chatModel: string;
  private readonly isEnabled: boolean;

  constructor() {
    this.apiKey = process.env.NVIDIA_API_KEY || '';
    this.chatModel = process.env.NVIDIA_CHAT_MODEL || 'nvidia/nemotron-3.5-bolt-e4b';
    this.isEnabled = process.env.NVIDIA_EVALUATION_ENABLED === 'true';
  }

  public isAvailable(): boolean {
    return this.isEnabled && !!this.apiKey;
  }

  public async evaluateAnswer(
    systemPrompt: string,
    userPrompt: string
  ): Promise<{ text: string; model: string }> {
    if (!this.isAvailable()) {
      throw new Error(
        'NVIDIA evaluation provider is disabled or missing credentials. It is reserved for development evaluation only.'
      );
    }

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NVIDIA Evaluation API returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return {
      text: data.choices?.[0]?.message?.content || '',
      model: this.chatModel,
    };
  }
}
