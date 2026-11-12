import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { ChatHandler } from './handlers/chatHandler';
import { DocumentMetadata } from '../src/types/chat';

// Load environment files
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

const chatHandler = new ChatHandler(process.cwd());

// Initialize retrieval service on server start
chatHandler.initialize().then(() => {
  console.log('✅ ChatHandler initialized and ready for queries.');
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const retrieval = chatHandler.getRetrievalService();
  const docs = retrieval.getDocuments();

  res.json({
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
});

// Sources endpoint
app.get('/api/sources', async (req, res) => {
  const retrieval = chatHandler.getRetrievalService();
  const docs = retrieval.getDocuments();

  const sanitized = docs.map((d) => ({
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

  res.json({
    count: sanitized.length,
    approvedCount: sanitized.filter((d) => d.verificationStatus === 'Approved').length,
    sources: sanitized,
  });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const result = await chatHandler.handleChat(req.body, clientIp);
  res.status(result.statusCode).json(result.response);
});

// Admin Document Management Endpoint
app.get('/api/admin/documents', (req, res) => {
  const metaPath = path.join(process.cwd(), 'knowledge_base', 'processed', 'metadata.json');
  if (fs.existsSync(metaPath)) {
    const docs = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    res.json(docs);
  } else {
    res.json([]);
  }
});

// Admin update document approval status
app.patch('/api/admin/documents/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['Uploaded', 'Processing', 'Needs review', 'Approved', 'Rejected', 'Archived'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status: ${status}` });
  }

  const metaPath = path.join(process.cwd(), 'knowledge_base', 'processed', 'metadata.json');
  if (!fs.existsSync(metaPath)) {
    return res.status(404).json({ error: 'Metadata file not found.' });
  }

  const docs: DocumentMetadata[] = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const doc = docs.find((d) => d.id === id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  doc.verificationStatus = status;
  fs.writeFileSync(metaPath, JSON.stringify(docs, null, 2), 'utf-8');

  // Re-initialize retrieval service
  await chatHandler.getRetrievalService().initialize();

  res.json({ success: true, document: doc });
});

// Serve frontend dist if built
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`📡 DYOD AI Backend API running at http://localhost:${port}`);
});
