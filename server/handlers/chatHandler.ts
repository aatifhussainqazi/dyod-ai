import { ChatRequest, ChatResponse } from '../../src/types/chat';
import { RequestValidator } from '../security/requestValidator';
import { MemoryRateLimiter } from '../security/rateLimiter';
import { QueryClassifier } from '../rag/queryClassifier';
import { RetrievalService } from '../rag/retrievalService';
import { DyodSystemPrompt } from '../prompts/dyodSystemPrompt';
import { ProviderManager } from '../ai/providerManager';
import { CitationValidator } from '../rag/citationValidator';

export class ChatHandler {
  private retrievalService: RetrievalService;
  private providerManager: ProviderManager;
  private rateLimiter: MemoryRateLimiter;
  private isInitialized = false;

  constructor(baseDir?: string) {
    this.retrievalService = new RetrievalService(baseDir);
    this.providerManager = new ProviderManager();
    this.rateLimiter = new MemoryRateLimiter(
      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '40', 10),
      parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)
    );
  }

  public async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await this.retrievalService.initialize();
      this.isInitialized = true;
    }
  }

  public async handleChat(
    body: any,
    clientIp: string = '127.0.0.1'
  ): Promise<{ statusCode: number; response: ChatResponse }> {
    await this.initialize();

    // 1. Rate Limiting Check
    const rateCheck = this.rateLimiter.checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return {
        statusCode: 429,
        response: {
          status: 'temporarily_unavailable',
          answer: `Rate limit exceeded. Please wait ${rateCheck.resetInSec} seconds before sending another message.`,
          citations: [],
          provider: 'system',
          grounded: false,
        },
      };
    }

    // 2. Request Validation
    const validation = RequestValidator.validateChatRequest(body);
    if (!validation.isValid || !validation.data) {
      return {
        statusCode: 400,
        response: {
          status: 'error',
          answer: validation.error || 'Invalid request format.',
          citations: [],
          provider: 'system',
          grounded: false,
          error: validation.error,
        },
      };
    }

    const { message, history, answerStyle } = validation.data;

    // Handle quick greetings
    if (/^(hi|hello|hey|salam|assalam u alaikum|good morning|good evening)$/i.test(message.trim())) {
      return {
        statusCode: 200,
        response: {
          status: 'answered',
          answer:
            "Hello! I am **DYOD AI**, your dedicated academic assistant for the **Design Your Own Degree (DYOD)** programme at IUST Awantipora. How can I assist you with your curriculum, academic baskets, practical methodologies, or project evaluation today?",
          citations: [],
          provider: 'system',
          grounded: true,
        },
      };
    }

    // 3. Scope Classification (Layer 1: DYOD-only scope check)
    const scopeResult = QueryClassifier.classify(message);
    if (scopeResult.isRefusalRequired) {
      return {
        statusCode: 200,
        response: {
          status: 'out_of_scope',
          answer: scopeResult.refusalMessage || QueryClassifier.getStandardRefusalMessage(),
          citations: [],
          provider: 'scope-guard',
          grounded: false,
        },
      };
    }

    // 4. Knowledge Retrieval (Layer 2: Local BM25 search)
    // For follow-up queries, combine last user question if current question is short
    let searchQuery = message;
    if (history && history.length > 0 && message.split(/\s+/).length <= 6) {
      const lastUserMsg = [...history].reverse().find((h) => h.sender === 'user');
      if (lastUserMsg) {
        searchQuery = `${lastUserMsg.content} ${message}`;
      }
    }

    const retrieval = this.retrievalService.retrieve(searchQuery, 6);

    // 5. Evidence Check (Layer 3: Threshold & specific topic validation)
    if (!retrieval.sufficientEvidence || retrieval.chunks.length === 0) {
      return {
        statusCode: 200,
        response: {
          status: 'insufficient_sources',
          answer: QueryClassifier.getUnsupportedMessage(),
          citations: [],
          provider: 'rag-engine',
          grounded: false,
        },
      };
    }

    // 6. Grounded System Prompt
    const systemPrompt = DyodSystemPrompt.buildPrompt(retrieval.chunks, answerStyle);

    // 7. Conversational Generation (Google Gemini Free Tier only)
    try {
      const generated = await this.providerManager.generateChatAnswer(
        systemPrompt,
        message,
        history
      );

      const lowerAnswer = generated.answer.toLowerCase();

      // Check if LLM determined insufficient evidence
      if (
        lowerAnswer.includes("couldn't find sufficient information") ||
        lowerAnswer.includes("could not find sufficient information") ||
        lowerAnswer.includes("insufficient information in the available")
      ) {
        return {
          statusCode: 200,
          response: {
            status: 'insufficient_sources',
            answer: QueryClassifier.getUnsupportedMessage(),
            citations: [],
            provider: generated.provider,
            grounded: false,
          },
        };
      }

      // Check if LLM generated an out of scope refusal
      if (
        lowerAnswer.includes("can't answer unrelated") ||
        lowerAnswer.includes("cannot answer unrelated") ||
        lowerAnswer.includes("unrelated general questions")
      ) {
        return {
          statusCode: 200,
          response: {
            status: 'out_of_scope',
            answer: QueryClassifier.getStandardRefusalMessage(),
            citations: [],
            provider: generated.provider,
            grounded: false,
          },
        };
      }

      // 8. Citation Validation (Layer 4: Real retrieved sources only)
      const validatedCitations = CitationValidator.validateCitations(
        generated.answer,
        retrieval.chunks
      );

      return {
        statusCode: 200,
        response: {
          status: 'answered',
          answer: generated.answer,
          citations: validatedCitations,
          provider: generated.provider,
          grounded: true,
        },
      };
    } catch (err: any) {
      console.error('Provider error in handleChat:', err.message);

      // Handle Quota Exhaustion per PRD Section 4.6 & Section 15
      if (err.message && err.message.toLowerCase().includes('quota')) {
        return {
          statusCode: 503,
          response: {
            status: 'temporarily_unavailable',
            answer:
              'The DYOD AI service has temporarily reached its free usage limit. Please try again later.',
            citations: [],
            provider: 'gemini-free-tier',
            grounded: false,
            error: 'FREE_TIER_QUOTA_EXHAUSTED',
          },
        };
      }

      return {
        statusCode: 500,
        response: {
          status: 'error',
          answer:
            'A temporary system error occurred while formulating the academic response. Please try again.',
          citations: [],
          provider: 'system',
          grounded: false,
          error: err.message,
        },
      };
    }
  }

  public getRetrievalService(): RetrievalService {
    return this.retrievalService;
  }

  public getProviderManager(): ProviderManager {
    return this.providerManager;
  }
}
