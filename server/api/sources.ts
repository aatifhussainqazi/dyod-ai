import type { VercelRequest, VercelResponse } from '@vercel/node';
import { RetrievalService } from '../rag/retrievalService';
import { DocumentMetadata } from '../../src/types/chat';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const retrieval = new RetrievalService();
  await retrieval.initialize();
  const docs: DocumentMetadata[] = retrieval.getDocuments();

  const sanitizedDocs = docs.map((d: DocumentMetadata) => ({
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
    approvedCount: sanitizedDocs.filter((d: any) => d.verificationStatus === 'Approved').length,
    sources: sanitizedDocs,
  });
}
