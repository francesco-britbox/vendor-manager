/**
 * PDF Text Extraction Library
 *
 * Extracts text content from PDF files for AI analysis.
 * Uses pdf-parse v2 library for robust PDF text extraction.
 */

import { PDFParse } from 'pdf-parse';

/**
 * Result of PDF text extraction
 */
export interface PDFExtractionResult {
  success: boolean;
  text: string;
  pageCount: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  error?: string;
}

/**
 * Options for PDF extraction
 */
export interface PDFExtractionOptions {
  /** Maximum number of pages to extract (0 = all pages) */
  maxPages?: number;
  /** Maximum text length to extract (0 = no limit) */
  maxTextLength?: number;
}

/**
 * Extract text content from a PDF buffer
 *
 * @param pdfBuffer - The PDF file as a Buffer
 * @param options - Extraction options
 * @returns Extraction result with text and metadata
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer,
  options: PDFExtractionOptions = {}
): Promise<PDFExtractionResult> {
  const { maxPages = 0, maxTextLength = 100000 } = options;

  try {
    // Create parser with buffer data
    const parser = new PDFParse({ data: pdfBuffer });

    // Get text content
    const textResult = await parser.getText();

    // Get document info
    const infoResult = await parser.getInfo();

    // Extract text from all pages or limited pages
    let text = '';
    const pages = textResult.pages || [];
    const pagesToProcess = maxPages > 0 ? pages.slice(0, maxPages) : pages;

    for (const page of pagesToProcess) {
      if (page.text) {
        text += page.text + '\n\n';
      }
    }

    // Truncate if needed
    if (maxTextLength > 0 && text.length > maxTextLength) {
      text = text.substring(0, maxTextLength) + '\n\n[Text truncated due to length limits]';
    }

    // Clean up text
    text = cleanExtractedText(text);

    // Extract metadata from info
    const info = infoResult.info;
    const metadata = info ? {
      title: info.Title || undefined,
      author: info.Author || undefined,
      subject: info.Subject || undefined,
      creator: info.Creator || undefined,
      producer: info.Producer || undefined,
      creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
      modificationDate: info.ModDate ? new Date(info.ModDate) : undefined,
    } : undefined;

    return {
      success: true,
      text,
      pageCount: infoResult.total || pages.length,
      metadata,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      success: false,
      text: '',
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Failed to extract text from PDF',
    };
  }
}

/**
 * Clean up extracted text
 * - Remove excessive whitespace
 * - Normalize line endings
 * - Remove null characters
 */
function cleanExtractedText(text: string): string {
  return text
    // Remove null characters
    .replace(/\0/g, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Replace multiple spaces with single space
    .replace(/ +/g, ' ')
    // Replace multiple newlines with double newline (paragraph break)
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace from each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}

/**
 * Check if a buffer appears to be a valid PDF
 */
export function isPDFBuffer(buffer: Buffer): boolean {
  // PDF files start with %PDF
  if (buffer.length < 4) return false;
  return buffer.slice(0, 4).toString() === '%PDF';
}

/**
 * Get basic info about a PDF without full extraction
 */
export async function getPDFInfo(pdfBuffer: Buffer): Promise<{
  valid: boolean;
  pageCount?: number;
  metadata?: PDFExtractionResult['metadata'];
  error?: string;
}> {
  try {
    const parser = new PDFParse({ data: pdfBuffer });
    const infoResult = await parser.getInfo();
    const info = infoResult.info;

    return {
      valid: true,
      pageCount: infoResult.total,
      metadata: info ? {
        title: info.Title || undefined,
        author: info.Author || undefined,
        subject: info.Subject || undefined,
        creator: info.Creator || undefined,
        producer: info.Producer || undefined,
      } : undefined,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid PDF',
    };
  }
}

/**
 * Extract text from specific pages
 */
export async function extractPagesFromPDF(
  pdfBuffer: Buffer,
  startPage: number = 1,
  endPage: number = 1
): Promise<PDFExtractionResult> {
  try {
    const parser = new PDFParse({ data: pdfBuffer });
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();

    // Get pages in range (1-indexed to 0-indexed)
    const pages = textResult.pages || [];
    const selectedPages = pages.slice(startPage - 1, endPage);

    let text = '';
    for (const page of selectedPages) {
      if (page.text) {
        text += page.text + '\n\n';
      }
    }

    text = cleanExtractedText(text);

    return {
      success: true,
      text,
      pageCount: Math.min(infoResult.total || pages.length, endPage - startPage + 1),
    };
  } catch (error) {
    return {
      success: false,
      text: '',
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Failed to extract pages from PDF',
    };
  }
}
