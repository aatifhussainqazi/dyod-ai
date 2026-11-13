import fs from 'node:fs';
import path from 'node:path';
import MiniSearch, { SearchResult } from 'minisearch';
import { DocumentCategory, DocumentChunk, DocumentMetadata } from '../../src/types/chat';

// Embedded pre-indexed knowledge base for reliable zero-IO serverless operation
import defaultMetadata from '../../knowledge_base/processed/metadata.json';
import defaultChunks from '../../knowledge_base/chunks/chunks.json';

export interface RetrievalResult {
  query: string;
  expandedQuery: string;
  targetCategory?: string;
  chunks: DocumentChunk[];
  scores: Record<string, number>;
  maxScore: number;
  sufficientEvidence: boolean;
  topicTermMatches: number;
  thresholdPassed: boolean;
  refusalReason?: string;
}

const COMMON_CONVERSATIONAL_STOP_WORDS = new Set([
  'what',
  'when',
  'where',
  'which',
  'who',
  'whom',
  'whose',
  'why',
  'how',
  'tell',
  'me',
  'about',
  'please',
  'give',
  'make',
  'the',
  'is',
  'are',
  'was',
  'were',
  'in',
  'on',
  'at',
  'by',
  'for',
  'with',
  'about',
  'against',
  'between',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'to',
  'from',
  'up',
  'down',
  'and',
  'or',
  'an',
  'a',
  'can',
  'you',
  'does',
  'do',
  'did',
  'this',
  'that',
  'so',
  'just',
  'my',
  'include',
  'included',
  'including',
  'contain',
  'contains',
  'list',
  'show',
  'describe',
]);

export class RetrievalService {
  private miniSearch: MiniSearch<DocumentChunk>;
  private chunksMap: Map<string, DocumentChunk> = new Map();
  private documentsMap: Map<string, DocumentMetadata> = new Map();
  private isLoaded = false;
  private readonly baseDir: string;
  private readonly MIN_SCORE_THRESHOLD = 8.0;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.cwd();
    this.miniSearch = new MiniSearch<DocumentChunk>({
      fields: ['text', 'heading', 'documentTitle', 'subject', 'category'],
      storeFields: [
        'id',
        'documentId',
        'documentTitle',
        'category',
        'subject',
        'semester',
        'page',
        'heading',
        'text',
        'tokenCountEstimate',
      ],
      searchOptions: {
        boost: { heading: 3.5, documentTitle: 2.5, subject: 2.0, text: 1.0 },
        prefix: true,
        fuzzy: 0.2,
        combineWith: 'OR',
      },
    });
  }

  public async initialize(): Promise<void> {
    try {
      let metadataList: DocumentMetadata[] = defaultMetadata as DocumentMetadata[];
      let chunksList: DocumentChunk[] = defaultChunks as DocumentChunk[];

      // If local filesystem override exists (e.g. newly ingested in dev), load from disk
      const chunksPath = path.join(this.baseDir, 'knowledge_base', 'chunks', 'chunks.json');
      const metaPath = path.join(this.baseDir, 'knowledge_base', 'processed', 'metadata.json');

      if (fs.existsSync(chunksPath) && fs.existsSync(metaPath)) {
        try {
          metadataList = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          chunksList = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'));
        } catch {}
      }

      this.documentsMap.clear();
      for (const meta of metadataList) {
        this.documentsMap.set(meta.id, meta);
      }

      this.chunksMap.clear();
      this.miniSearch.removeAll();

      // Only Approved documents enter active retrieval
      const approvedChunks = chunksList.filter((chunk) => {
        const doc = this.documentsMap.get(chunk.documentId);
        return doc && doc.verificationStatus === 'Approved';
      });

      for (const chunk of approvedChunks) {
        this.chunksMap.set(chunk.id, chunk);
      }

      if (approvedChunks.length > 0) {
        this.miniSearch.addAll(approvedChunks);
      }

      this.isLoaded = true;
    } catch (err: any) {
      console.error('Failed to initialize RetrievalService:', err.message);
      this.isLoaded = true;
    }
  }

  public expandQuery(rawQuery: string): { expandedText: string; boostCategory?: DocumentCategory } {
    const lower = rawQuery.toLowerCase().trim();
    let expanded = lower;
    let boostCategory: DocumentCategory | undefined = undefined;

    // Number normalization
    expanded = expanded.replace(/\beight\b/g, '8 eight');
    expanded = expanded.replace(/\bseven\b/g, '7 seven');
    expanded = expanded.replace(/\bsix\b/g, '6 six');
    expanded = expanded.replace(/\bfour\b/g, '4 four');
    expanded = expanded.replace(/\bthree\b/g, '3 three');
    expanded = expanded.replace(/\btwo\b/g, '2 two');
    expanded = expanded.replace(/\bone\b/g, '1 one');

    // Strip leading conversational filler
    const stripped = lower.replace(/^(so|tell me|can you explain|what is|what are|explain)\s+/i, '').trim();

    // 1. DYOD Programme identity questions
    if (
      /\b(what is dyod|about dyod|meaning of dyod|define dyod|what dyod means|why dyod|design your own degree)\b/i.test(
        lower
      ) ||
      stripped === 'dyod'
    ) {
      expanded += ' "Design your own degree" DYOD IUST "Why Design your own degree" "Academic Scheme" multidisciplinary degree';
      boostCategory = 'Programme Information';
    }

    // 2. Basket questions
    if (/\b(basket|baskets|8 baskets|eight baskets)\b/i.test(lower)) {
      expanded += ' "Course Baskets" "Basket number" "8 baskets" "Natural Sciences" "Mathematical Sciences" "Computing and Data Science" "Humanities" "Engineering" "Sustainability" "Design" "Wellness"';
      boostCategory = 'Programme Information';
    }

    // 3. Programme Structure & Curriculum questions
    if (/\b(structure|framework|curriculum|scheme|modalities)\b/i.test(lower)) {
      expanded += ' "Academic Scheme" "Semester-wise Structure" "DYOD@IUST - Basic Modalities" credits duration';
      boostCategory = 'Programme Information';
    }

    // 4. Subject / Course questions
    if (/\b(subject|subjects|course|courses|syllabus)\b/i.test(lower)) {
      expanded += ' "Academic Scheme -Semester-I" "Academic Scheme -Semester-II" "Courses and Courses Basket Mapping" "Sample Course Content"';
      boostCategory = 'Programme Information';
    }

    // 5. Project evaluation questions
    if (/\b(evaluation|rubric|viva|assessment|phases|marks|score)\b/i.test(lower)) {
      expanded += ' "Evaluation Strategy" "Term-End Project" "Phase" "Rubric" viva';
      boostCategory = 'Examination and Assessment';
    }

    // 6. Practical / Seed paper questions
    if (/\b(seed paper|waste paper|pulp|deckle|mesh|soaking|blending|drying)\b/i.test(lower)) {
      expanded += ' "Waste Paper to Seed Paper" methodology practical pulping';
      boostCategory = 'Practical Work';
    }

    return { expandedText: expanded, boostCategory };
  }

  public retrieve(query: string, topK: number = 6): RetrievalResult {
    if (!this.isLoaded) {
      return {
        query,
        expandedQuery: query,
        chunks: [],
        scores: {},
        maxScore: 0,
        sufficientEvidence: false,
        topicTermMatches: 0,
        thresholdPassed: false,
        refusalReason: 'Knowledge base index not loaded',
      };
    }

    const cleanedQuery = query.replace(/[^\w\s-]/g, ' ').trim();
    if (!cleanedQuery) {
      return {
        query,
        expandedQuery: query,
        chunks: [],
        scores: {},
        maxScore: 0,
        sufficientEvidence: false,
        topicTermMatches: 0,
        thresholdPassed: false,
        refusalReason: 'Empty query',
      };
    }

    // Expand query with synonyms, numbers, and category weights
    const { expandedText, boostCategory } = this.expandQuery(cleanedQuery);

    // Extract substantive search keywords (preserving technical and domain words)
    const substantiveKeywords = cleanedQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !COMMON_CONVERSATIONAL_STOP_WORDS.has(w));

    const rawResults: SearchResult[] = this.miniSearch.search(expandedText);

    if (rawResults.length === 0) {
      return {
        query,
        expandedQuery: expandedText,
        targetCategory: boostCategory,
        chunks: [],
        scores: {},
        maxScore: 0,
        sufficientEvidence: false,
        topicTermMatches: 0,
        thresholdPassed: false,
        refusalReason: 'No matching chunks found in BM25 index',
      };
    }

    // Apply category priority boost for authoritative matches
    const scoredResults = rawResults.map((res) => {
      const chunk = this.chunksMap.get(res.id);
      let adjustedScore = res.score;
      if (chunk && boostCategory && chunk.category === boostCategory) {
        adjustedScore *= 2.5; // Boost authoritative category
      }
      return { ...res, score: adjustedScore, chunk };
    });

    // Re-sort with category adjustments
    scoredResults.sort((a, b) => b.score - a.score);

    const maxScore = scoredResults[0]?.score || 0;
    const topResults = scoredResults.slice(0, topK);

    const chunks: DocumentChunk[] = [];
    const scores: Record<string, number> = {};
    for (const res of topResults) {
      scores[res.id] = res.score;
      if (res.chunk) {
        chunks.push(res.chunk);
      }
    }

    // Check substantive topic keyword presence in retrieved corpus (with stemming and alias matching)
    let topicTermMatches = 0;
    if (substantiveKeywords.length > 0) {
      const combinedRetrievedText = chunks.map((c) => `${c.heading} ${c.text}`).join(' ').toLowerCase();
      for (const word of substantiveKeywords) {
        const stem = word.endsWith('ies')
          ? word.slice(0, -3) + 'y'
          : word.endsWith('es')
          ? word.slice(0, -2)
          : word.endsWith('s')
          ? word.slice(0, -1)
          : word;

        const altStem = word.startsWith('program') ? 'program' : stem;

        if (
          combinedRetrievedText.includes(word) ||
          combinedRetrievedText.includes(stem) ||
          combinedRetrievedText.includes(altStem)
        ) {
          topicTermMatches++;
        }
      }
    }

    // Threshold check
    const thresholdPassed = maxScore >= this.MIN_SCORE_THRESHOLD && chunks.length > 0;

    // Substantive evidence check:
    // 1. If explicit category boost was matched and score is solid, evidence is confirmed
    // 2. Otherwise require topic keyword representation in the retrieved passages
    let hasSubstantiveEvidence = false;
    if (boostCategory !== undefined && maxScore >= this.MIN_SCORE_THRESHOLD * 2) {
      hasSubstantiveEvidence = true;
    } else if (substantiveKeywords.length >= 3) {
      hasSubstantiveEvidence = topicTermMatches >= 1;
    } else if (substantiveKeywords.length > 0) {
      hasSubstantiveEvidence = topicTermMatches >= 1 || maxScore >= 30.0;
    } else {
      hasSubstantiveEvidence = thresholdPassed;
    }

    const sufficientEvidence = thresholdPassed && hasSubstantiveEvidence;

    let refusalReason: string | undefined = undefined;
    if (!thresholdPassed) {
      refusalReason = `Max BM25 score (${maxScore.toFixed(1)}) below minimum threshold (${this.MIN_SCORE_THRESHOLD})`;
    } else if (!hasSubstantiveEvidence) {
      refusalReason = `Substantive topic keywords [${substantiveKeywords.join(', ')}] not adequately represented in retrieved chunks`;
    }

    return {
      query,
      expandedQuery: expandedText,
      targetCategory: boostCategory,
      chunks,
      scores,
      maxScore,
      sufficientEvidence,
      topicTermMatches,
      thresholdPassed,
      refusalReason,
    };
  }

  public getDocuments(): DocumentMetadata[] {
    return Array.from(this.documentsMap.values());
  }

  public getApprovedChunkCount(): number {
    return this.chunksMap.size;
  }
}
