import { ChatRequest } from '../../src/types/chat';

export class RequestValidator {
  private static readonly MAX_CHARS = parseInt(process.env.MAX_REQUEST_SIZE || '10000', 10);

  public static validateChatRequest(body: any): { isValid: boolean; error?: string; data?: ChatRequest } {
    if (!body || typeof body !== 'object') {
      return { isValid: false, error: 'Request body must be a JSON object.' };
    }

    if (typeof body.message !== 'string' || body.message.trim().length === 0) {
      return { isValid: false, error: 'Message cannot be empty.' };
    }

    const trimmed = body.message.trim();

    if (trimmed.length > this.MAX_CHARS) {
      return {
        isValid: false,
        error: `Message exceeds maximum allowed character length of ${this.MAX_CHARS}.`,
      };
    }

    const history = Array.isArray(body.history)
      ? body.history.filter(
          (h: any) =>
            h &&
            typeof h.content === 'string' &&
            (h.sender === 'user' || h.sender === 'assistant')
        )
      : [];

    const answerStyle = [
      'simple',
      'detailed',
      'exam',
      'quick',
      'step-by-step',
      'comparison',
    ].includes(body.answerStyle)
      ? body.answerStyle
      : 'detailed';

    return {
      isValid: true,
      data: {
        message: trimmed,
        conversationId: typeof body.conversationId === 'string' ? body.conversationId : undefined,
        history,
        answerStyle,
      },
    };
  }
}
