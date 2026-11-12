import { Citation, DocumentChunk } from '../../src/types/chat';

export class CitationValidator {
  public static validateCitations(
    answer: string,
    retrievedChunks: DocumentChunk[]
  ): Citation[] {
    if (!retrievedChunks || retrievedChunks.length === 0) {
      return [];
    }

    const citations: Citation[] = [];
    const seenSources = new Set<string>();

    // Scan for chunk relevance in the answer
    for (const chunk of retrievedChunks) {
      // Create a unique key per doc and page
      const key = `${chunk.documentId}-p${chunk.page}`;
      if (seenSources.has(key)) continue;

      // Extract significant terms from chunk heading and text (e.g. keywords > 5 chars)
      const heading = chunk.heading.trim();
      const cleanHeading = heading.replace(/^[0-9\.\s#]+/, '').trim().toLowerCase();
      
      const containsHeading = cleanHeading.length > 4 && answer.toLowerCase().includes(cleanHeading);
      const containsDocTitle = answer.toLowerCase().includes(chunk.documentTitle.toLowerCase());
      
      // Check significant words overlap
      const words = chunk.text
        .split(/\s+/)
        .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter((w) => w.length >= 6);
      
      let matchCount = 0;
      for (const word of words.slice(0, 50)) {
        if (answer.toLowerCase().includes(word)) {
          matchCount++;
        }
      }

      // If chunk contributed to the answer
      if (containsHeading || containsDocTitle || matchCount >= 3 || citations.length < 2) {
        seenSources.add(key);

        // Generate excerpt snippet
        const snippet = chunk.text.slice(0, 180).replace(/\s+/g, ' ').trim() + '...';

        citations.push({
          documentTitle: chunk.documentTitle,
          page: chunk.page,
          section: chunk.heading,
          sourceId: chunk.documentId,
          snippet,
          category: chunk.category,
        });
      }

      // Max 4 citations per response
      if (citations.length >= 4) {
        break;
      }
    }

    return citations;
  }
}
