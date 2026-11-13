export type ScopeClassification =
  | 'IN_SCOPE'
  | 'OUT_OF_SCOPE'
  | 'IN_SCOPE_BUT_INSUFFICIENT_SOURCES';

export interface ScopeClassificationResult {
  scope: ScopeClassification;
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

  private static readonly EXPLICIT_IN_SCOPE_PATTERNS = [
    /\b(what is dyod|so what is dyod|meaning of dyod|define dyod|about dyod|why dyod|design your own degree)\b/i,
    /\b(basket|baskets|eight baskets|8 baskets|course baskets|academic baskets)\b/i,
    /\b(programme structure|program structure|academic structure|academic scheme|curriculum|framework|modalities)\b/i,
    /\b(subjects|courses|syllabus|semester subjects|modules)\b/i,
    /\b(seed paper|waste paper|practical|methodology|deckle|pulp|viva|rubric|evaluation strategy|term end project)\b/i,
    /\b(credits|majors|minor|exit options|early exit|certificate|diploma|degree)\b/i,
    /\b(iust|awantipora|design innovation centre|dic)\b/i,
  ];

  public static classify(query: string): ScopeClassificationResult {
    const trimmed = query.trim().toLowerCase();

    // 1. Check prompt injection attempts -> strictly OUT_OF_SCOPE
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          scope: 'OUT_OF_SCOPE',
          isPotentiallyInScope: false,
          isRefusalRequired: true,
          isInjectionAttempt: true,
          refusalReason: 'Prompt injection attempt detected',
          refusalMessage:
            "I'm DYOD AI, your dedicated academic assistant for the DYOD programme at IUST. I operate strictly under academic guidelines and cannot alter my foundational operating principles.",
        };
      }
    }

    // 2. Check prohibited general off-scope topics -> strictly OUT_OF_SCOPE
    for (const keyword of this.PROHIBITED_KEYWORDS) {
      if (trimmed.includes(keyword)) {
        return {
          scope: 'OUT_OF_SCOPE',
          isPotentiallyInScope: false,
          isRefusalRequired: true,
          refusalReason: `Prohibited off-scope topic: ${keyword}`,
          refusalMessage: this.getStandardRefusalMessage(),
        };
      }
    }

    // 3. Check explicit DYOD academic scope patterns -> definitely IN_SCOPE
    for (const pattern of this.EXPLICIT_IN_SCOPE_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          scope: 'IN_SCOPE',
          isPotentiallyInScope: true,
          isRefusalRequired: false,
        };
      }
    }

    // 4. Greetings
    if (/^(hi|hello|hey|salam|assalam u alaikum|good morning|good evening|greetings)$/i.test(trimmed)) {
      return {
        scope: 'IN_SCOPE',
        isPotentiallyInScope: true,
        isRefusalRequired: false,
      };
    }

    // 5. Academic/Coursework queries default to IN_SCOPE for retrieval testing
    return {
      scope: 'IN_SCOPE',
      isPotentiallyInScope: true,
      isRefusalRequired: false,
    };
  }

  public static getUnsupportedMessage(): string {
    return "I understand you're asking about the DYOD programme. However, I couldn't find enough information in the currently approved study materials to answer this accurately.\n\nTry checking the Programme Information documents, or ask your administrator to add the relevant material.";
  }

  public static getStandardRefusalMessage(): string {
    return "I'm DYOD AI, your dedicated academic assistant for the DYOD programme at IUST. I can help with questions covered by the approved DYOD study materials, but I can't answer unrelated general questions.";
  }
}
