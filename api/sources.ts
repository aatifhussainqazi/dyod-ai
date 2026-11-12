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

  // Return sanitized document metadata (no internal server file paths)
  const sanitizedDocs = docs.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    subject: d.subject || 'General DYOD Curriculum',
    semester: d.semester || 'Undergraduate',
    academicYear: d.academicYear || '2024-2028',
    verificationStatus: d.verificationStatus,
    pageCount: d.pageCount,
    summary: d.summary || '',
  }));

  return res.status(200).json({
    count: sanitizedDocs.length,
    approvedCount: sanitizedDocs.filter((d) => d.verificationStatus === 'Approved').length,
    sources: sanitizedDocs,
  });
}
