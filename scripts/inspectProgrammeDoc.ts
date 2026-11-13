import fs from 'fs';
import path from 'path';

const chunksPath = path.join(process.cwd(), 'knowledge_base', 'chunks', 'chunks.json');
const chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'));

const progChunks = chunks.filter((c: any) => c.documentId.includes('academic-structure'));
console.log(`Found ${progChunks.length} chunks for academic structure:`);

for (let i = 0; i < Math.min(15, progChunks.length); i++) {
  const c = progChunks[i];
  console.log(`\n==============================================`);
  console.log(`Page: ${c.page} | Heading: "${c.heading}"`);
  console.log(`Text (first 300 chars):`);
  console.log(c.text.slice(0, 300).replace(/\s+/g, ' '));
}
