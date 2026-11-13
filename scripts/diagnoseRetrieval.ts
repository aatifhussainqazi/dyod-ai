import { RetrievalService } from '../server/rag/retrievalService';
import { QueryClassifier } from '../server/rag/queryClassifier';

async function diagnose() {
  const rs = new RetrievalService(process.cwd());
  await rs.initialize();

  const testQueries = [
    'so what is dyod',
    'what is dyod',
    'what are the eight baskets',
    'what are the 8 baskets',
    'Explain the DYOD programme structure',
    'What subjects are included in my programme',
    'Who won yesterday cricket match',
    'Suggest a gaming laptop',
  ];

  console.log('========================================================================');
  console.log('🔍 DYOD AI RETRIEVAL & CLASSIFICATION DIAGNOSTIC');
  console.log('========================================================================\n');

  for (const q of testQueries) {
    console.log(`\n------------------------------------------------------------------------`);
    console.log(`Query: "${q}"`);

    const classification = QueryClassifier.classify(q);
    console.log(`Classification:`, classification);

    const retrieval = rs.retrieve(q, 5);
    console.log(`Retrieval: sufficientEvidence = ${retrieval.sufficientEvidence}, maxScore = ${retrieval.maxScore.toFixed(2)}, topicTermMatches = ${retrieval.topicTermMatches}`);
    console.log(`Retrieved chunks count: ${retrieval.chunks.length}`);

    retrieval.chunks.forEach((chunk, i) => {
      console.log(`  [#${i + 1}] Doc: "${chunk.documentTitle}" | Page: ${chunk.page} | Heading: "${chunk.heading}" | Score: ${retrieval.scores[chunk.id]?.toFixed(2)}`);
    });
  }
}

diagnose().catch(console.error);
