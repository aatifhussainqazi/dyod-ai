import { DocumentChunk, DocumentMetadata } from '../../src/types/chat';
import { ExtractedPage } from './documentExtractor';

export class ChunkService {
  private static readonly TARGET_CHUNK_CHARS = 1800; // ~450-600 tokens
  private static readonly MAX_CHUNK_CHARS = 2600;
  private static readonly OVERLAP_CHARS = 250;

  public static chunkPages(
    doc: DocumentMetadata,
    pages: ExtractedPage[]
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let chunkSeq = 1;

    for (const page of pages) {
      const pageText = page.text.trim();
      if (!pageText) continue;

      const pageHeading = this.detectMainHeading(pageText) || `Page ${page.pageNumber}`;

      if (pageText.length <= this.MAX_CHUNK_CHARS) {
        chunks.push({
          id: `${doc.id}-p${page.pageNumber}-c${chunkSeq++}`,
          documentId: doc.id,
          documentTitle: doc.title,
          category: doc.category,
          subject: doc.subject,
          semester: doc.semester,
          page: page.pageNumber,
          heading: pageHeading,
          text: pageText,
          tokenCountEstimate: Math.ceil(pageText.length / 4),
        });
        continue;
      }

      // If page is larger than target chunk size, split by paragraphs or headings
      const paragraphs = pageText.split(/\n\s*\n/);
      let currentChunkText = '';
      let currentHeading = pageHeading;

      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        const paraHeading = this.detectParagraphHeading(trimmed);
        if (paraHeading) {
          currentHeading = paraHeading;
        }

        if (
          currentChunkText.length + trimmed.length > this.TARGET_CHUNK_CHARS &&
          currentChunkText.length > 500
        ) {
          // Push current chunk
          chunks.push({
            id: `${doc.id}-p${page.pageNumber}-c${chunkSeq++}`,
            documentId: doc.id,
            documentTitle: doc.title,
            category: doc.category,
            subject: doc.subject,
            semester: doc.semester,
            page: page.pageNumber,
            heading: currentHeading,
            text: currentChunkText.trim(),
            tokenCountEstimate: Math.ceil(currentChunkText.length / 4),
          });

          // Retain overlap from end of previous chunk
          const overlap = currentChunkText.slice(-this.OVERLAP_CHARS);
          currentChunkText = overlap + '\n\n' + trimmed;
        } else {
          currentChunkText = currentChunkText
            ? `${currentChunkText}\n\n${trimmed}`
            : trimmed;
        }
      }

      if (currentChunkText.trim().length > 0) {
        chunks.push({
          id: `${doc.id}-p${page.pageNumber}-c${chunkSeq++}`,
          documentId: doc.id,
          documentTitle: doc.title,
          category: doc.category,
          subject: doc.subject,
          semester: doc.semester,
          page: page.pageNumber,
          heading: currentHeading,
          text: currentChunkText.trim(),
          tokenCountEstimate: Math.ceil(currentChunkText.length / 4),
        });
      }
    }

    return chunks;
  }

  private static detectMainHeading(text: string): string | null {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    // Check first 3 lines for a heading-like line
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      if (/^#{1,3}\s+(.*)/.test(line)) {
        return line.replace(/^#{1,3}\s+/, '').slice(0, 80);
      }
      if (/^(\d+(\.\d+)*)\s+[A-Z].*/.test(line)) {
        return line.slice(0, 80);
      }
      if (line.length < 60 && line === line.toUpperCase() && /[A-Z]/.test(line)) {
        return line;
      }
    }
    return lines[0].slice(0, 80);
  }

  private static detectParagraphHeading(para: string): string | null {
    const firstLine = para.split('\n')[0].trim();
    if (/^#{1,4}\s+(.*)/.test(firstLine)) {
      return firstLine.replace(/^#{1,4}\s+/, '').slice(0, 80);
    }
    if (/^(\d+(\.\d+)*)\s+[A-Z].*/.test(firstLine) && firstLine.length < 90) {
      return firstLine.slice(0, 80);
    }
    if (firstLine.length < 60 && firstLine === firstLine.toUpperCase() && /[A-Z]/.test(firstLine)) {
      return firstLine;
    }
    return null;
  }
}
