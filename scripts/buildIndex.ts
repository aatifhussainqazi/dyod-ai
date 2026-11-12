import fs from 'fs';
import path from 'path';
import MiniSearch from 'minisearch';
import { DocumentChunk, DocumentMetadata } from '../src/types/chat';

async function main() {
  console.log('🔍 Building Local BM25 MiniSearch Index...');
  const baseDir = process.cwd();
  const chunksPath = path.join(baseDir, 'knowledge_base', 'chunks', 'chunks.json');
  const metaPath = path.join(baseDir, 'knowledge_base', 'processed', 'metadata.json');
  const indexOutDir = path.join(baseDir, 'knowledge_base', 'index');

  if (!fs.existsSync(chunksPath) || !fs.existsSync(metaPath)) {
    console.error('❌ Chunks or metadata file missing. Run `npm run ingest` first.');
    process.exit(1);
  }

  const metadataList: DocumentMetadata[] = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const approvedDocs = new Set(
    metadataList.filter((d) => d.verificationStatus === 'Approved').map((d) => d.id)
  );

  const chunksList: DocumentChunk[] = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'));
  const approvedChunks = chunksList.filter((c) => approvedDocs.has(c.documentId));

  console.log(`Loaded ${chunksList.length} total chunks. Approved: ${approvedChunks.length}`);

  const miniSearch = new MiniSearch<DocumentChunk>({
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

  miniSearch.addAll(approvedChunks);

  const indexJson = JSON.stringify(miniSearch);
  const indexOutFile = path.join(indexOutDir, 'minisearch.json');
  fs.writeFileSync(indexOutFile, indexJson, 'utf-8');

  console.log(`💾 Saved BM25 index (${(indexJson.length / 1024).toFixed(1)} KB) to ${indexOutFile}`);

  // Test sample search queries to verify indexing performance
  const testQueries = [
    'baskets academic structure',
    'evaluation strategy term end project',
    'seed paper methodology pulp',
    'phytotoxicity germination',
  ];

  console.log('\n🔎 Testing sample BM25 retrieval queries:');
  for (const q of testQueries) {
    const results = miniSearch.search(q);
    const top = results[0];
    console.log(
      `   Query: "${q}" -> ${results.length} matches. Top score: ${top ? top.score.toFixed(2) : 'none'} (Doc: ${top?.documentTitle || 'none'})`
    );
  }

  console.log('\n✅ BM25 Index build successful!');
}

main().catch((err) => {
  console.error('Fatal error building index:', err);
  process.exit(1);
});
