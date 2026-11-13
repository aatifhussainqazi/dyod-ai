import { RetrievalService } from '../server/rag/retrievalService';
import MiniSearch, { SearchResult } from 'minisearch';
import { DocumentChunk } from '../src/types/chat';

function expandQuery(query: string): { expandedText: string; boostCategory?: string } {
  const lower = query.toLowerCase().trim();
  let expanded = lower;
  let boostCategory: string | undefined = undefined;

  // Number normalization
  expanded = expanded.replace(/\beight\b/g, '8 eight');
  expanded = expanded.replace(/\bseven\b/g, '7 seven');
  expanded = expanded.replace(/\bsix\b/g, '6 six');
  expanded = expanded.replace(/\bfour\b/g, '4 four');
  expanded = expanded.replace(/\bthree\b/g, '3 three');
  expanded = expanded.replace(/\btwo\b/g, '2 two');
  expanded = expanded.replace(/\bone\b/g, '1 one');

  // Strip conversational leading filler like "so what is", "tell me about"
  const stripped = lower.replace(/^(so|tell me|can you explain|what is|what are|explain)\s+/i, '').trim();

  // DYOD Programme identity questions
  if (/\b(what is dyod|about dyod|meaning of dyod|define dyod|what dyod means|why dyod|design your own degree)\b/i.test(lower) || stripped === 'dyod') {
    expanded += ' "Design your own degree" DYOD IUST "Why Design your own degree" "Academic Scheme" multidisciplinary degree';
    boostCategory = 'Programme Information';
  }

  // Basket questions
  if (/\b(basket|baskets|8 baskets|eight baskets)\b/i.test(lower)) {
    expanded += ' "Course Baskets" "Basket number" "8 baskets" "Natural Sciences" "Mathematical Sciences" "Computing and Data Science" "Humanities" "Engineering" "Sustainability" "Design" "Wellness"';
    boostCategory = 'Programme Information';
  }

  // Programme Structure & Curriculum questions
  if (/\b(structure|framework|curriculum|scheme|modalities)\b/i.test(lower)) {
    expanded += ' "Academic Scheme" "Semester-wise Structure" "DYOD@IUST - Basic Modalities" credits duration';
    boostCategory = 'Programme Information';
  }

  // Subject / Course questions
  if (/\b(subject|subjects|course|courses|syllabus)\b/i.test(lower)) {
    expanded += ' "Academic Scheme -Semester-I" "Academic Scheme -Semester-II" "Courses and Courses Basket Mapping" "Sample Course Content"';
    boostCategory = 'Programme Information';
  }

  // Project evaluation questions
  if (/\b(evaluation|rubric|viva|assessment|phases|marks|score)\b/i.test(lower)) {
    expanded += ' "Evaluation Strategy" "Term-End Project" "Phase" "Rubric" viva';
    boostCategory = 'Examination and Assessment';
  }

  // Practical / Seed paper questions
  if (/\b(seed paper|waste paper|pulp|deckle|mesh|soaking|blending|drying)\b/i.test(lower)) {
    expanded += ' "Waste Paper to Seed Paper" methodology practical pulping';
    boostCategory = 'Practical Work';
  }

  return { expandedText: expanded, boostCategory };
}

async function run() {
  const rs = new RetrievalService();
  await rs.initialize();

  const miniSearch = (rs as any).miniSearch as MiniSearch<DocumentChunk>;
  const chunksMap = (rs as any).chunksMap as Map<string, DocumentChunk>;

  const queries = [
    'so what is dyod',
    'what is dyod',
    'what are the eight baskets',
    'what are the 8 baskets',
    'Explain the DYOD programme structure',
    'What subjects are included in my programme',
  ];

  for (const q of queries) {
    console.log(`\n======================================================`);
    console.log(`QUERY: "${q}"`);
    const { expandedText, boostCategory } = expandQuery(q);
    console.log(`Expanded search: "${expandedText}"`);
    console.log(`Target Category Boost: ${boostCategory || 'None'}`);

    const rawResults: SearchResult[] = miniSearch.search(expandedText);

    // Apply category boost and rank
    const scoredResults = rawResults.map((r) => {
      const chunk = chunksMap.get(r.id);
      let adjustedScore = r.score;
      if (chunk && boostCategory && chunk.category === boostCategory) {
        adjustedScore *= 2.5; // Significant boost for authoritative category
      }
      return { ...r, score: adjustedScore, chunk };
    });

    scoredResults.sort((a, b) => b.score - a.score);

    const top = scoredResults.slice(0, 5);
    console.log(`Top matches:`);
    top.forEach((r, i) => {
      const c = r.chunk;
      if (c) {
        console.log(`  [#${i + 1}] [${c.category}] (Score: ${r.score.toFixed(1)}) "${c.documentTitle}" (p.${c.page}) - Heading: "${c.heading}"`);
      }
    });
  }
}

run().catch(console.error);
