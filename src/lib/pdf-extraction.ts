/**
 * PDF Text Extraction Library
 *
 * Extracts text content from PDF files for AI analysis.
 * Uses pdf-parse library for robust PDF text extraction.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');

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
    // Parse PDF with options
    const parseOptions: { max?: number } = {};

    // Limit pages if specified
    if (maxPages > 0) {
      parseOptions.max = maxPages;
    }

    const data = await pdf(pdfBuffer, parseOptions);

    // Extract text
    let text = data.text || '';

    // Truncate if needed
    if (maxTextLength > 0 && text.length > maxTextLength) {
      text = text.substring(0, maxTextLength) + '\n\n[Text truncated due to length limits]';
    }

    // Clean up text
    text = cleanExtractedText(text);

    // Extract metadata
    const metadata = data.info ? {
      title: data.info.Title,
      author: data.info.Author,
      subject: data.info.Subject,
      creator: data.info.Creator,
      producer: data.info.Producer,
      creationDate: data.info.CreationDate ? new Date(data.info.CreationDate) : undefined,
      modificationDate: data.info.ModDate ? new Date(data.info.ModDate) : undefined,
    } : undefined;

    return {
      success: true,
      text,
      pageCount: data.numpages,
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
    // Quick parse with first page only
    const data = await pdf(pdfBuffer, { max: 1 });

    return {
      valid: true,
      pageCount: data.numpages,
      metadata: data.info ? {
        title: data.info.Title,
        author: data.info.Author,
        subject: data.info.Subject,
        creator: data.info.Creator,
        producer: data.info.Producer,
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
    // pdf-parse doesn't support page ranges directly,
    // so we extract all and note limitations
    const parseOptions: { max?: number } = {
      max: endPage,
    };

    const data = await pdf(pdfBuffer, parseOptions);

    const text = cleanExtractedText(data.text || '');

    return {
      success: true,
      text,
      pageCount: Math.min(data.numpages, endPage),
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
