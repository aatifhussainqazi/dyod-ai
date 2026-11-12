export interface KnowledgeSourceItem {
  id: string;
  title: string;
  category: string;
  subject: string;
  semester: string;
  academicYear: string;
  verificationStatus: string;
  pageCount: number;
  summary: string;
}

export interface SourcesResponse {
  count: number;
  approvedCount: number;
  sources: KnowledgeSourceItem[];
}

export interface HealthResponse {
  status: string;
  service: string;
  primaryProvider: string;
  primaryModel: string;
  freeTierOnly: boolean;
  paidFallback: boolean;
  knowledgeBase: {
    approvedDocumentsCount: number;
    approvedChunksCount: number;
    retrievalEngine: string;
    budgetTarget: string;
  };
}

export class SourceService {
  public static async getSources(): Promise<SourcesResponse | null> {
    try {
      const res = await fetch('/api/sources');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public static async getHealth(): Promise<HealthResponse | null> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}
