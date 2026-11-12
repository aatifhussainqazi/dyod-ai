import fs from 'fs';
import path from 'path';
import { DocumentExtractor } from '../server/rag/documentExtractor';
import { ChunkService } from '../server/rag/chunkService';
import { DocumentCategory, DocumentMetadata, DocumentChunk } from '../src/types/chat';

// Known initial catalog mapping for official DYOD documents
const DOCUMENT_DEFINITIONS: Record<
  string,
  {
    title: string;
    category: DocumentCategory;
    subject?: string;
    semester?: string;
    academicYear?: string;
    summary: string;
  }
> = {
  'DYOD_Academic_Structure_Curriculum_IUST.pdf': {
    title: 'DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST',
    category: 'Programme Information',
    subject: 'Design Your Own Degree Framework',
    semester: 'Semesters 1-8',
    academicYear: '2024-2028',
    summary: 'Official IUST curriculum presentation covering DYOD philosophy, 8 academic baskets, credit categorization, majors, flexibility, and early exit options.',
  },
  'DYOD_Evaluation_Strategy_Term_End_Project.pdf': {
    title: 'Evaluation Strategy for Term-End Project of Undergraduate Students, BS DYOD, IUST',
    category: 'Examination and Assessment',
    subject: 'Term-End Project Evaluation',
    semester: 'Undergraduate DYOD',
    academicYear: '2025-2026',
    summary: 'Official university rubric and phased evaluation strategy for assessing undergraduate DYOD term-end projects, viva voce, deliverables, and assessment metrics.',
  },
  'DYOD_Project_Detailed_Methodology_Seed_Paper.pdf': {
    title: 'From Waste Paper to Seed Paper Phase 2: Detailed Project Implementation & Methodology',
    category: 'Practical Work',
    subject: 'Sustainability & Material Reuse',
    semester: 'Term-End Practical',
    academicYear: '2025-2026',
    summary: 'Step-by-step practical methodology for converting campus waste paper into plantable seed paper, pulp preparation, blending, screening, pressing, and drying.',
  },
  'DYOD_Seed_Paper_Research_Viva_Compendium.pdf': {
    title: 'BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper',
    category: 'Projects',
    subject: 'Paper Fiber Science & Plant Phytotoxicity',
    semester: 'Term-End Project',
    academicYear: '2025-2026',
    summary: 'Comprehensive scientific and defense handbook detailing paper fiber chemistry, hydrogen bonding, ink toxicity, seed viability, Petri dish germination standards, and viva defenses.',
  },
  'DYOD_Seed_Paper_Presentation_Guide.pdf': {
    title: 'Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide',
    category: 'Course Materials',
    subject: 'Environmental Innovation & Circular Economy',
    semester: 'Term-End Practical',
    academicYear: '2025-2026',
    summary: 'Slide presentation and practical project guide on environmental campus paper recovery, seed integration, and ecological benefits.',
  },
};

async function main() {
  console.log('🚀 Starting DYOD Document Ingestion Pipeline...');
  const baseDir = process.cwd();
  const approvedDir = path.join(baseDir, 'knowledge_base', 'approved');
  const processedDir = path.join(baseDir, 'knowledge_base', 'processed');
  const chunksDir = path.join(baseDir, 'knowledge_base', 'chunks');
  const indexDir = path.join(baseDir, 'knowledge_base', 'index');

  fs.mkdirSync(approvedDir, { recursive: true });
  fs.mkdirSync(processedDir, { recursive: true });
  fs.mkdirSync(chunksDir, { recursive: true });
  fs.mkdirSync(indexDir, { recursive: true });

  const files = fs.readdirSync(approvedDir).filter((f) => !f.startsWith('.'));
  console.log(`Found ${files.length} document(s) in ${approvedDir}`);

  const metadataList: DocumentMetadata[] = [];
  const allChunks: DocumentChunk[] = [];

  for (const filename of files) {
    const filePath = path.join(approvedDir, filename);
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const docId = `doc-${filename.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

    const def = DOCUMENT_DEFINITIONS[filename] || {
      title: filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      category: 'Course Materials' as DocumentCategory,
      summary: 'Approved DYOD academic document.',
    };

    console.log(`\n📄 Processing: ${filename}`);
    try {
      const extracted = await DocumentExtractor.extractFile(filePath);
      console.log(`   - Extracted ${extracted.pageCount} pages (${extracted.text.length} chars)`);

      const metadata: DocumentMetadata = {
        id: docId,
        originalFilename: filename,
        title: def.title,
        category: def.category,
        subject: def.subject,
        semester: def.semester,
        academicYear: def.academicYear,
        sourceType: ext as any,
        verificationStatus: 'Approved', // Pre-approved official source documents
        uploadDate: new Date().toISOString().split('T')[0],
        version: '1.0',
        pageCount: extracted.pageCount,
        extractionStatus: extracted.status,
        summary: def.summary,
      };

      const chunks = ChunkService.chunkPages(metadata, extracted.pages);
      console.log(`   - Generated ${chunks.length} chunks`);

      metadataList.push(metadata);
      allChunks.push(...chunks);
    } catch (err: any) {
      console.error(`❌ Failed to process ${filename}:`, err.message);
    }
  }

  // Save metadata list
  const metaOutPath = path.join(processedDir, 'metadata.json');
  fs.writeFileSync(metaOutPath, JSON.stringify(metadataList, null, 2), 'utf-8');
  console.log(`\n💾 Saved ${metadataList.length} document metadata records to ${metaOutPath}`);

  // Save all chunks
  const chunksOutPath = path.join(chunksDir, 'chunks.json');
  fs.writeFileSync(chunksOutPath, JSON.stringify(allChunks, null, 2), 'utf-8');
  console.log(`💾 Saved ${allChunks.length} chunks to ${chunksOutPath}`);

  console.log('\n✅ Document ingestion completed successfully!');
}

main().catch((err) => {
  console.error('Fatal error in ingestion:', err);
  process.exit(1);
});
