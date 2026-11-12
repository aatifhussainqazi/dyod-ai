export interface ScopeClassificationResult {
  isPotentiallyInScope: boolean;
  isRefusalRequired: boolean;
  refusalReason?: string;
  refusalMessage?: string;
  isInjectionAttempt?: boolean;
}

export class QueryClassifier {
  private static readonly PROHIBITED_KEYWORDS = [
    'cricket',
    'ipl',
    'fifa',
    'world cup',
    'football match',
    'weather today',
    'tomorrow weather',
    'forecast',
    'gaming laptop',
    'buy laptop',
    'best smartphone',
    'instagram caption',
    'tiktok',
    'relationship advice',
    'breakup',
    'dating tips',
    'horoscope',
    'astrology',
    'crypto price',
    'bitcoin price',
    'movie review',
    'netflix recommendations',
    'celebrity gossip',
    'recipe for',
    'how to cook',
    'diet plan',
    'gym workout',
  ];

  private static readonly INJECTION_PATTERNS = [
    /ignore (all )?(previous|prior|above) (instructions|rules|prompts)/i,
    /bypass (all )?(restrictions|filters|guards)/i,
    /you are now (an? unrestricted|in developer mode|jailbroken|dan)/i,
    /disregard (the )?dyod/i,
    /pretend (that )?(everything|anything|this) is (in )?syllabus/i,
    /what is your (system prompt|hidden prompt|instructions|api key)/i,
    /reveal your (api key|prompt|backend)/i,
  ];

  public static classify(query: string): ScopeClassificationResult {
    const trimmed = query.trim().toLowerCase();

    // Check injection attempts
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          isPotentiallyInScope: false,
          isRefusalRequired: true,
          isInjectionAttempt: true,
          refusalReason: 'Prompt injection attempt detected',
          refusalMessage:
            "I'm DYOD AI, your dedicated academic assistant for the DYOD programme at IUST. I operate strictly under academic guidelines and cannot alter my foundational operating principles.",
        };
      }
    }

    // Check prohibited general topics
    for (const keyword of this.PROHIBITED_KEYWORDS) {
      if (trimmed.includes(keyword)) {
        return {
          isPotentiallyInScope: false,
          isRefusalRequired: true,
          refusalReason: `Prohibited off-scope topic: ${keyword}`,
          refusalMessage:
            "I'm DYOD AI, your dedicated academic assistant for the DYOD programme at IUST. I can help with questions covered by the approved DYOD study materials, but I can't answer unrelated general questions.",
        };
      }
    }

    // If query is an empty greeting or general conversational greeting
    if (/^(hi|hello|hey|salam|assalam u alaikum|good morning|good evening)$/i.test(trimmed)) {
      return {
        isPotentiallyInScope: true,
        isRefusalRequired: false,
      };
    }

    // Otherwise, potentially in scope - will be tested against retrieval threshold
    return {
      isPotentiallyInScope: true,
      isRefusalRequired: false,
    };
  }

  public static getUnsupportedMessage(): string {
    return "I couldn't find sufficient information about this topic in the available DYOD study materials. Please check with your instructor or provide the relevant approved study material.";
  }

  public static getStandardRefusalMessage(): string {
    return "I'm DYOD AI, your dedicated academic assistant for the DYOD programme at IUST. I can help with questions covered by the approved DYOD study materials, but I can't answer unrelated general questions.";
  }
}
