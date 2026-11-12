import type { VercelRequest, VercelResponse } from '@vercel/node';
import dotenv from 'dotenv';
import path from 'path';
import { RetrievalService } from '../server/rag/retrievalService';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const retrieval = new RetrievalService();
  await retrieval.initialize();
  const docs = retrieval.getDocuments();

  return res.status(200).json({
    status: 'healthy',
    service: 'DYOD AI Academic Assistant',
    institution: 'Islamic University of Science and Technology (IUST)',
    programme: 'Design Your Own Degree (DYOD)',
    timestamp: new Date().toISOString(),
    primaryProvider: 'gemini-free-tier',
    primaryModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    freeTierOnly: true,
    paidFallback: false,
    nvidiaEvaluationEnabled: process.env.NVIDIA_EVALUATION_ENABLED === 'true',
    knowledgeBase: {
      approvedDocumentsCount: docs.filter((d) => d.verificationStatus === 'Approved').length,
      totalDocumentsCount: docs.length,
      approvedChunksCount: retrieval.getApprovedChunkCount(),
      retrievalEngine: 'Local BM25 (MiniSearch)',
      budgetTarget: '₹0 (Free tier only)',
    },
  });
}
