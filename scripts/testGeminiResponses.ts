import dotenv from 'dotenv';
import path from 'path';
import { RetrievalService } from '../server/rag/retrievalService';
import { DyodSystemPrompt } from '../server/prompts/dyodSystemPrompt';
import { GeminiProvider } from '../server/ai/geminiProvider';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function test() {
  const rs = new RetrievalService();
  await rs.initialize();
  const gemini = new GeminiProvider();

  for (const q of ['so what is dyod', 'what are the eight baskets']) {
    console.log(`\n======================================================`);
    console.log(`Testing Query: "${q}"`);
    const ret = rs.retrieve(q, 6);
    console.log(`Retrieved ${ret.chunks.length} chunks. Top chunk: [${ret.chunks[0]?.documentTitle}, p.${ret.chunks[0]?.page}]`);
    const prompt = DyodSystemPrompt.buildPrompt(ret.chunks, 'detailed');
    const res = await gemini.generateAnswer(prompt, q, []);
    console.log(`Gemini response:\n${res.text}`);
  }
}

test().catch(console.error);
