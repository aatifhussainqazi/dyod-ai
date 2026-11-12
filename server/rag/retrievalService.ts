import fs from 'fs';
import path from 'path';
import MiniSearch, { SearchResult } from 'minisearch';
import { DocumentChunk, DocumentMetadata } from '../../src/types/chat';

// Embedded pre-indexed knowledge base for reliable zero-IO serverless operation
import defaultMetadata from '../../knowledge_base/processed/metadata.json';
import defaultChunks from '../../knowledge_base/chunks/chunks.json';

export interface RetrievalResult {
  chunks: DocumentChunk[];
  scores: Record<string, number>;
  maxScore: number;
  sufficientEvidence: boolean;
  topicTermMatches: number;
}

const COMMON_STOP_WORDS = new Set([
  'dyod',
  'iust',
  'programme',
  'program',
  'degree',
  'student',
  'students',
  'university',
  'what',
  'when',
  'where',
  'which',
  'who',
  'whom',
  'whose',
  'why',
  'how',
  'explain',
  'describe',
  'tell',
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
        boost: { heading: 3.0, documentTitle: 2.5, subject: 2.0, text: 1.0 },
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

  public retrieve(query: string, topK: number = 7): RetrievalResult {
    if (!this.isLoaded) {
      return { chunks: [], scores: {}, maxScore: 0, sufficientEvidence: false, topicTermMatches: 0 };
    }

    const cleanedQuery = query.replace(/[^\w\s-]/g, ' ').trim();
    if (!cleanedQuery) {
      return { chunks: [], scores: {}, maxScore: 0, sufficientEvidence: false, topicTermMatches: 0 };
    }

    // Extract substantive topic keywords from user query
    const queryWords = cleanedQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !COMMON_STOP_WORDS.has(w));

    const rawResults: SearchResult[] = this.miniSearch.search(cleanedQuery);

    if (rawResults.length === 0) {
      return { chunks: [], scores: {}, maxScore: 0, sufficientEvidence: false, topicTermMatches: 0 };
    }

    const maxScore = rawResults[0].score;
    const scores: Record<string, number> = {};
    const topResults = rawResults.slice(0, topK);

    const chunks: DocumentChunk[] = [];
    for (const res of topResults) {
      scores[res.id] = res.score;
      const chunk = this.chunksMap.get(res.id);
      if (chunk) {
        chunks.push(chunk);
      }
    }

    // Check how many specific topic terms appear in the top retrieved chunks
    let topicTermMatches = 0;
    if (queryWords.length > 0) {
      const combinedRetrievedText = chunks.map((c) => `${c.heading} ${c.text}`).join(' ').toLowerCase();
      for (const word of queryWords) {
        if (combinedRetrievedText.includes(word)) {
          topicTermMatches++;
        }
      }
    }

    // Substantive evidence requirement:
    let hasSubstantiveEvidence = true;
    if (queryWords.length >= 3) {
      hasSubstantiveEvidence = topicTermMatches >= 2;
    } else if (queryWords.length > 0) {
      hasSubstantiveEvidence = topicTermMatches >= 1;
    }

    const sufficientEvidence =
      maxScore >= this.MIN_SCORE_THRESHOLD && chunks.length > 0 && hasSubstantiveEvidence;

    return {
      chunks,
      scores,
      maxScore,
      sufficientEvidence,
      topicTermMatches,
    };
  }

  public getDocuments(): DocumentMetadata[] {
    return Array.from(this.documentsMap.values());
  }

  public getApprovedChunkCount(): number {
    return this.chunksMap.size;
  }
}
