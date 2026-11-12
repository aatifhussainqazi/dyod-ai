import { ChatRequest, ChatResponse } from '../types/chat';

export class ChatService {
  public static async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data: ChatResponse = await response.json();

      if (!response.ok) {
        if (response.status === 429 || (data.error && data.error.includes('QUOTA'))) {
          return {
            status: 'temporarily_unavailable',
            answer:
              'The DYOD AI service has temporarily reached its free usage limit. Please try again later.',
            citations: [],
            provider: 'system',
            grounded: false,
          };
        }

        return {
          status: 'error',
          answer: data.answer || 'An error occurred while connecting to DYOD AI.',
          citations: [],
          provider: 'system',
          grounded: false,
          error: data.error,
        };
      }

      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        return {
          status: 'error',
          answer: 'The request timed out. Please check your network and try again.',
          citations: [],
          provider: 'system',
          grounded: false,
        };
      }

      return {
        status: 'error',
        answer: 'Unable to reach the DYOD AI service. Please check your network connection.',
        citations: [],
        provider: 'system',
        grounded: false,
        error: err.message,
      };
    }
  }
}
