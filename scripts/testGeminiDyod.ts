import dotenv from 'dotenv';
import path from 'path';
import { RetrievalService } from '../server/rag/retrievalService';
import { DyodSystemPrompt } from '../server/prompts/dyodSystemPrompt';
import { GeminiProvider } from '../server/ai/geminiProvider';
import MiniSearch, { SearchResult } from 'minisearch';
import { DocumentChunk } from '../src/types/chat';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function test() {
  const rs = new RetrievalService();
  await rs.initialize();
  const gemini = new GeminiProvider();

  const miniSearch = (rs as any).miniSearch as MiniSearch<DocumentChunk>;
  const chunksMap = (rs as any).chunksMap as Map<string, DocumentChunk>;

  // Use the expanded search for "so what is dyod"
  const rawResults: SearchResult[] = miniSearch.search('so what is dyod "Design your own degree" DYOD IUST "Why Design your own degree" "Academic Scheme" multidisciplinary degree');
  const scored = rawResults.map(r => {
    const chunk = chunksMap.get(r.id)!;
    return { ...r, score: chunk.category === 'Programme Information' ? r.score * 2.5 : r.score, chunk };
  }).sort((a,b) => b.score - a.score);

  const topChunks = scored.slice(0, 5).map(s => s.chunk);

  const prompt = DyodSystemPrompt.buildPrompt(topChunks, 'detailed');
  const res = await gemini.generateAnswer(prompt, 'so what is dyod', []);
  console.log('Gemini Answer to "so what is dyod":');
  console.log(res.text);
}

test().catch(console.error);
