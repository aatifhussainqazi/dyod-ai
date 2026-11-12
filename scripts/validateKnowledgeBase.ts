import fs from 'fs';
import path from 'path';
import { RetrievalService } from '../server/rag/retrievalService';

async function main() {
  console.log('🩺 Validating DYOD Knowledge Base Integrity...');
  const baseDir = process.cwd();
  const metaPath = path.join(baseDir, 'knowledge_base', 'processed', 'metadata.json');
  const chunksPath = path.join(baseDir, 'knowledge_base', 'chunks', 'chunks.json');

  if (!fs.existsSync(metaPath) || !fs.existsSync(chunksPath)) {
    console.error('❌ Knowledge base files not found!');
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'));

  console.log(`\n📚 Total Documents: ${metadata.length}`);
  for (const doc of metadata) {
    const docChunks = chunks.filter((c: any) => c.documentId === doc.id);
    console.log(`   - [${doc.verificationStatus}] ${doc.title} (${doc.pageCount} pages, ${docChunks.length} chunks)`);
    if (docChunks.length === 0 && doc.verificationStatus === 'Approved') {
      console.warn(`     ⚠️ Warning: Approved document ${doc.id} has 0 chunks!`);
    }
  }

  console.log(`\n🧩 Total Chunks: ${chunks.length}`);

  const retrievalService = new RetrievalService(baseDir);
  await retrievalService.initialize();

  const sampleQuestions = [
    'What are the 8 academic baskets in DYOD?',
    'What is the evaluation strategy for the term end project?',
    'Explain the pulp preparation process for seed paper',
    'What are the early exit options in DYOD?',
  ];

  console.log('\n🔎 Testing Retrieval on Sample Core DYOD Questions:');
  for (const q of sampleQuestions) {
    const res = retrievalService.retrieve(q, 3);
    console.log(`\nQ: "${q}"`);
    console.log(`   Evidence Sufficient: ${res.sufficientEvidence} (Max BM25 Score: ${res.maxScore.toFixed(1)})`);
    console.log(`   Retrieved Chunks: ${res.chunks.length}`);
    for (const c of res.chunks) {
      console.log(`     * [${c.documentTitle}, p.${c.page}] ${c.heading}`);
    }
  }

  console.log('\n✅ Knowledge Base validation completed successfully!');
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
