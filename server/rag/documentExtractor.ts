import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedDocumentResult {
  text: string;
  pages: ExtractedPage[];
  pageCount: number;
  status: 'success' | 'warning' | 'failed';
  warnings: string[];
}

export class DocumentExtractor {
  public static async extractFile(filePath: string): Promise<ExtractedDocumentResult> {
    const ext = path.extname(filePath).toLowerCase();
    const warnings: string[] = [];

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    if (ext === '.pdf') {
      return await this.extractPdf(filePath);
    } else if (ext === '.docx') {
      return await this.extractDocx(filePath);
    } else if (ext === '.txt' || ext === '.md') {
      return await this.extractPlainText(filePath);
    } else {
      throw new Error(`Unsupported file extension: ${ext}`);
    }
  }

  private static async extractPdf(filePath: string): Promise<ExtractedDocumentResult> {
    const dataBuffer = fs.readFileSync(filePath);
    const pages: ExtractedPage[] = [];
    const warnings: string[] = [];

    let currentPage = 1;

    // Use pagerender option in pdf-parse to collect per-page text
    const options = {
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          let lastY: number | null = null;
          let text = '';
          for (const item of textContent.items) {
            if (lastY === null || Math.abs(lastY - item.transform[5]) > 5) {
              text += '\n' + item.str;
            } else {
              text += ' ' + item.str;
            }
            lastY = item.transform[5];
          }
          const cleaned = text.trim();
          pages.push({
            pageNumber: currentPage++,
            text: cleaned,
          });
          return text;
        });
      },
    };

    const data = await pdfParse(dataBuffer, options);
    const fullText = pages.map((p) => p.text).join('\n\n');

    let status: 'success' | 'warning' | 'failed' = 'success';
    if (pages.length === 0 || fullText.trim().length < 50) {
      status = 'warning';
      warnings.push('Document contains very little text. It might be scanned or image-based.');
    }

    return {
      text: fullText,
      pages,
      pageCount: data.numpages || pages.length,
      status,
      warnings,
    };
  }

  private static async extractDocx(filePath: string): Promise<ExtractedDocumentResult> {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value.trim();
    const warnings = result.messages.map((m) => m.message);

    return {
      text,
      pages: [{ pageNumber: 1, text }],
      pageCount: 1,
      status: text.length > 50 ? 'success' : 'warning',
      warnings,
    };
  }

  private static async extractPlainText(filePath: string): Promise<ExtractedDocumentResult> {
    const text = fs.readFileSync(filePath, 'utf-8').trim();
    return {
      text,
      pages: [{ pageNumber: 1, text }],
      pageCount: 1,
      status: text.length > 0 ? 'success' : 'warning',
      warnings: [],
    };
  }
}
