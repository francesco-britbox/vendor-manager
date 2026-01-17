/**
 * Vendor Document Analyzer Service
 *
 * Orchestrates the full document analysis pipeline:
 * 1. Fetch document from database (or S3 for legacy documents)
 * 2. Extract text from PDF/images
 * 3. Analyze with AI
 * 4. Store results in database
 */

import { prisma } from '@/lib/prisma';
import {
  downloadFileFromS3,
  isS3Configured,
} from '@/lib/storage';
import { extractTextFromPDF, isPDFBuffer } from '@/lib/pdf-extraction';
import {
  getDecryptedApiKey,
  getAvailableProvider,
  logAIUsage,
  estimateCost,
} from '@/lib/ai-config';
import { updateExtractionStatus, getDocumentById } from '@/lib/vendor-documents';
import type { VendorDocumentAnalysis, AIProvider } from '@/types';

/**
 * Result of document analysis operation
 */
export interface DocumentAnalysisResult {
  success: boolean;
  analysis?: VendorDocumentAnalysis;
  error?: string;
  details?: {
    provider?: string;
    model?: string;
    textLength?: number;
    processingTime?: number;
  };
}

/**
 * Options for document analysis
 */
export interface DocumentAnalyzerOptions {
  /** Force re-analysis even if analysis exists */
  force?: boolean;
  /** Specific provider to use */
  provider?: AIProvider;
  /** Specific model to use */
  model?: string;
}

/**
 * The system prompt for vendor document analysis
 */
const VENDOR_DOCUMENT_ANALYSIS_PROMPT = `You are an expert contract and document analyst. Analyze the provided document text and extract the following information. For each field, provide your confidence score (0.0 to 1.0) based on how clearly the information was stated in the document.

Extract the following fields:
1. contractCreationDate - The document creation or effective date (format: human-readable, e.g., "December 31, 2025")
2. expiryRenewalDate - The document end/expiration date or renewal date
3. involvedEntities - All company/organization names mentioned (as comma-separated list)
4. slaDetails - Service Level Agreements mentioned (response times, uptime guarantees, etc.)
5. uptimeGuarantee - Specific uptime guarantee percentage (e.g., "99.9%")
6. responseTime - Response time commitments (e.g., "24 hours", "4 business hours")
7. scopeOfWork - Summary of the scope of work/services (2-3 sentences)
8. termsAndConditions - Key terms and conditions summary
9. terminationClauses - Conditions under which the agreement can be terminated
10. commercialTerms - Pricing, payment terms, fees summary
11. paymentSchedule - Payment due dates, frequency
12. totalValue - Total contract/document value if mentioned
13. currency - Currency of monetary values (e.g., "GBP", "USD", "EUR")
14. noticePeriod - Required notice period for termination or changes
15. renewalTerms - Auto-renewal terms, renewal procedures
16. keyContacts - Important contacts mentioned (names, roles, emails if available)
17. summary - Brief 2-3 sentence summary of the entire document

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation):
{
  "contractCreationDate": "string or null",
  "expiryRenewalDate": "string or null",
  "involvedEntities": "string or null",
  "slaDetails": "string or null",
  "uptimeGuarantee": "string or null",
  "responseTime": "string or null",
  "scopeOfWork": "string or null",
  "termsAndConditions": "string or null",
  "terminationClauses": "string or null",
  "commercialTerms": "string or null",
  "paymentSchedule": "string or null",
  "totalValue": "string or null",
  "currency": "string or null",
  "noticePeriod": "string or null",
  "renewalTerms": "string or null",
  "keyContacts": "string or null",
  "summary": "string or null",
  "confidenceScores": {
    "contractCreationDate": 0.0,
    "expiryRenewalDate": 0.0,
    "involvedEntities": 0.0,
    "slaDetails": 0.0,
    "uptimeGuarantee": 0.0,
    "responseTime": 0.0,
    "scopeOfWork": 0.0,
    "termsAndConditions": 0.0,
    "terminationClauses": 0.0,
    "commercialTerms": 0.0,
    "paymentSchedule": 0.0,
    "totalValue": 0.0,
    "currency": 0.0,
    "noticePeriod": 0.0,
    "renewalTerms": 0.0,
    "keyContacts": 0.0,
    "summary": 0.0
  }
}

If information for a field is not found or unclear, set the value to null and the confidence score to 0.0.
If information is partially found, set an appropriate confidence score between 0.1 and 0.7.
If information is clearly stated, set confidence score between 0.8 and 1.0.`;

/**
 * AI Analysis result structure
 */
interface AIAnalysisData {
  contractCreationDate?: string;
  expiryRenewalDate?: string;
  involvedEntities?: string;
  slaDetails?: string;
  uptimeGuarantee?: string;
  responseTime?: string;
  scopeOfWork?: string;
  termsAndConditions?: string;
  terminationClauses?: string;
  commercialTerms?: string;
  paymentSchedule?: string;
  totalValue?: string;
  currency?: string;
  noticePeriod?: string;
  renewalTerms?: string;
  keyContacts?: string;
  summary?: string;
  confidenceScores: Record<string, number>;
}

/**
 * Analyze a vendor document by ID
 */
export async function analyzeVendorDocument(
  documentId: string,
  options: DocumentAnalyzerOptions = {}
): Promise<DocumentAnalysisResult> {
  const startTime = Date.now();

  try {
    // Get document with analysis
    const document = await getDocumentById(documentId);

    if (!document) {
      return {
        success: false,
        error: 'Document not found',
      };
    }

    // Check if analysis already exists and force is not set
    if (document.aiAnalysis && !options.force) {
      return {
        success: true,
        analysis: document.aiAnalysis,
        details: {
          provider: 'cached',
        },
      };
    }

    // Get available provider
    const provider = options.provider || await getAvailableProvider();
    if (!provider) {
      await updateExtractionStatus(documentId, 'failed', 'No AI provider configured');
      return {
        success: false,
        error: 'AI analysis is not configured. Please set up API keys in settings.',
      };
    }

    // Get API key
    const apiKey = await getDecryptedApiKey(provider);
    if (!apiKey) {
      // Fall back to environment variable
      const envKey = provider === 'anthropic'
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY;

      if (!envKey) {
        await updateExtractionStatus(documentId, 'failed', 'No API key available');
        return {
          success: false,
          error: `No API key configured for ${provider}`,
        };
      }
    }

    // Update status to processing
    await updateExtractionStatus(documentId, 'processing');

    // Check document type (only PDF supported for now)
    if (document.documentMimeType !== 'application/pdf') {
      await updateExtractionStatus(documentId, 'failed', 'Only PDF documents are supported for AI analysis');
      return {
        success: false,
        error: `Document type "${document.documentMimeType}" is not supported for AI analysis. Please upload a PDF document.`,
      };
    }

    // Get full document record to retrieve binary data
    const fullDocument = await prisma.vendorDocument.findUnique({
      where: { id: documentId },
      select: {
        documentData: true,
        storageType: true,
        documentKey: true,
      },
    });

    if (!fullDocument) {
      await updateExtractionStatus(documentId, 'failed', 'Document not found');
      return {
        success: false,
        error: 'Document not found',
      };
    }

    let pdfBuffer: Buffer;

    // Download document from database or S3 based on storage type
    if (fullDocument.storageType === 'database' && fullDocument.documentData) {
      // Document is stored in database
      pdfBuffer = Buffer.from(fullDocument.documentData);
    } else if (fullDocument.documentKey) {
      // Document is stored in S3 (legacy)
      if (!isS3Configured()) {
        await updateExtractionStatus(documentId, 'failed', 'Document is stored in S3 but S3 is not configured');
        return {
          success: false,
          error: 'Document is stored in S3 but S3 is not configured. Please run migration.',
        };
      }
      const fileData = await downloadFileFromS3(fullDocument.documentKey);
      pdfBuffer = Buffer.from(fileData.body);
    } else {
      await updateExtractionStatus(documentId, 'failed', 'Document data not found');
      return {
        success: false,
        error: 'Document data not found',
      };
    }

    // Verify it's a valid PDF
    if (!isPDFBuffer(pdfBuffer)) {
      await updateExtractionStatus(documentId, 'failed', 'Invalid PDF file');
      return {
        success: false,
        error: 'The document is not a valid PDF file',
      };
    }

    // Extract text from PDF
    const extractionResult = await extractTextFromPDF(pdfBuffer);

    if (!extractionResult.success) {
      await updateExtractionStatus(documentId, 'failed', `Text extraction failed: ${extractionResult.error}`);
      return {
        success: false,
        error: `Failed to extract text from PDF: ${extractionResult.error}`,
      };
    }

    if (!extractionResult.text || extractionResult.text.length < 50) {
      await updateExtractionStatus(documentId, 'failed', 'Insufficient extractable text');
      return {
        success: false,
        error: 'The document does not contain enough extractable text. It may be a scanned document or image-based PDF.',
      };
    }

    // Determine model
    const model = options.model || getDefaultModel(provider);

    // Analyze with AI
    const analysisData = await runAIAnalysis(
      extractionResult.text,
      provider,
      apiKey || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY! : process.env.OPENAI_API_KEY!),
      model
    );

    const processingTime = Date.now() - startTime;

    // Store analysis in database
    const dbAnalysis = await prisma.vendorDocumentAnalysis.upsert({
      where: { documentId },
      create: {
        documentId,
        ...analysisData,
        aiProvider: provider,
        aiModel: model,
        processingTimeMs: processingTime,
        analyzedAt: new Date(),
      },
      update: {
        ...analysisData,
        aiProvider: provider,
        aiModel: model,
        processingTimeMs: processingTime,
        analyzedAt: new Date(),
      },
    });

    // Update document status
    await updateExtractionStatus(documentId, 'completed');

    // Log usage (rough estimate - actual tokens would come from API response)
    const estimatedInputTokens = Math.ceil(extractionResult.text.length / 4);
    const estimatedOutputTokens = 1000;
    const cost = estimateCost(provider, model, estimatedInputTokens, estimatedOutputTokens);

    await logAIUsage({
      provider,
      model,
      operation: 'vendor_document_analysis',
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      estimatedCost: cost,
      processingTime,
      documentId,
    });

    return {
      success: true,
      analysis: transformAnalysis(dbAnalysis),
      details: {
        provider,
        model,
        textLength: extractionResult.text.length,
        processingTime,
      },
    };
  } catch (error) {
    console.error('Document analysis error:', error);
    await updateExtractionStatus(
      documentId,
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred during analysis',
    };
  }
}

/**
 * Get default model for a provider
 */
function getDefaultModel(provider: AIProvider): string {
  return provider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o';
}

/**
 * Run AI analysis on text
 */
async function runAIAnalysis(
  text: string,
  provider: AIProvider,
  apiKey: string,
  model: string
): Promise<AIAnalysisData> {
  // Truncate very long documents
  const maxLength = 50000;
  let processedText = text;
  if (text.length > maxLength) {
    processedText = text.substring(0, maxLength) + '\n\n[Document text truncated due to length limits]';
  }

  if (provider === 'anthropic') {
    return await analyzeWithClaude(processedText, apiKey, model);
  } else {
    return await analyzeWithOpenAI(processedText, apiKey, model);
  }
}

/**
 * Analyze with Claude
 */
async function analyzeWithClaude(
  text: string,
  apiKey: string,
  model: string
): Promise<AIAnalysisData> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: VENDOR_DOCUMENT_ANALYSIS_PROMPT,
    messages: [
      { role: 'user', content: `Analyze this document:\n\n${text}` },
    ],
  });

  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('No response from Claude');
  }

  return parseAIResponse(content.text);
}

/**
 * Analyze with OpenAI
 */
async function analyzeWithOpenAI(
  text: string,
  apiKey: string,
  model: string
): Promise<AIAnalysisData> {
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: VENDOR_DOCUMENT_ANALYSIS_PROMPT },
      { role: 'user', content: `Analyze this document:\n\n${text}` },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return parseAIResponse(content);
}

/**
 * Parse and validate AI response
 */
function parseAIResponse(content: string): AIAnalysisData {
  try {
    let jsonStr = content.trim();

    // Handle markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr);

    return {
      contractCreationDate: typeof parsed.contractCreationDate === 'string' ? parsed.contractCreationDate : undefined,
      expiryRenewalDate: typeof parsed.expiryRenewalDate === 'string' ? parsed.expiryRenewalDate : undefined,
      involvedEntities: typeof parsed.involvedEntities === 'string' ? parsed.involvedEntities : undefined,
      slaDetails: typeof parsed.slaDetails === 'string' ? parsed.slaDetails : undefined,
      uptimeGuarantee: typeof parsed.uptimeGuarantee === 'string' ? parsed.uptimeGuarantee : undefined,
      responseTime: typeof parsed.responseTime === 'string' ? parsed.responseTime : undefined,
      scopeOfWork: typeof parsed.scopeOfWork === 'string' ? parsed.scopeOfWork : undefined,
      termsAndConditions: typeof parsed.termsAndConditions === 'string' ? parsed.termsAndConditions : undefined,
      terminationClauses: typeof parsed.terminationClauses === 'string' ? parsed.terminationClauses : undefined,
      commercialTerms: typeof parsed.commercialTerms === 'string' ? parsed.commercialTerms : undefined,
      paymentSchedule: typeof parsed.paymentSchedule === 'string' ? parsed.paymentSchedule : undefined,
      totalValue: typeof parsed.totalValue === 'string' ? parsed.totalValue : undefined,
      currency: typeof parsed.currency === 'string' ? parsed.currency : undefined,
      noticePeriod: typeof parsed.noticePeriod === 'string' ? parsed.noticePeriod : undefined,
      renewalTerms: typeof parsed.renewalTerms === 'string' ? parsed.renewalTerms : undefined,
      keyContacts: typeof parsed.keyContacts === 'string' ? parsed.keyContacts : undefined,
      summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
      confidenceScores: normalizeConfidenceScores(parsed.confidenceScores),
    };
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse AI response as JSON');
  }
}

/**
 * Normalize confidence scores
 */
function normalizeConfidenceScores(scores: unknown): Record<string, number> {
  const defaultScores: Record<string, number> = {
    contractCreationDate: 0,
    expiryRenewalDate: 0,
    involvedEntities: 0,
    slaDetails: 0,
    uptimeGuarantee: 0,
    responseTime: 0,
    scopeOfWork: 0,
    termsAndConditions: 0,
    terminationClauses: 0,
    commercialTerms: 0,
    paymentSchedule: 0,
    totalValue: 0,
    currency: 0,
    noticePeriod: 0,
    renewalTerms: 0,
    keyContacts: 0,
    summary: 0,
  };

  if (!scores || typeof scores !== 'object') {
    return defaultScores;
  }

  const result: Record<string, number> = {};
  const validKeys = Object.keys(defaultScores);

  for (const key of validKeys) {
    const value = (scores as Record<string, unknown>)[key];
    if (typeof value === 'number' && value >= 0 && value <= 1) {
      result[key] = Math.round(value * 100) / 100;
    } else {
      result[key] = 0;
    }
  }

  return result;
}

/**
 * Transform database analysis to API type
 */
function transformAnalysis(dbAnalysis: {
  id: string;
  documentId: string;
  contractCreationDate: string | null;
  expiryRenewalDate: string | null;
  involvedEntities: string | null;
  slaDetails: string | null;
  uptimeGuarantee: string | null;
  responseTime: string | null;
  scopeOfWork: string | null;
  termsAndConditions: string | null;
  terminationClauses: string | null;
  commercialTerms: string | null;
  paymentSchedule: string | null;
  totalValue: string | null;
  currency: string | null;
  noticePeriod: string | null;
  renewalTerms: string | null;
  keyContacts: string | null;
  summary: string | null;
  confidenceScores: unknown;
  aiProvider: string | null;
  aiModel: string | null;
  processingTimeMs: number | null;
  analyzedAt: Date;
}): VendorDocumentAnalysis {
  return {
    id: dbAnalysis.id,
    documentId: dbAnalysis.documentId,
    contractCreationDate: dbAnalysis.contractCreationDate || undefined,
    expiryRenewalDate: dbAnalysis.expiryRenewalDate || undefined,
    involvedEntities: dbAnalysis.involvedEntities || undefined,
    slaDetails: dbAnalysis.slaDetails || undefined,
    uptimeGuarantee: dbAnalysis.uptimeGuarantee || undefined,
    responseTime: dbAnalysis.responseTime || undefined,
    scopeOfWork: dbAnalysis.scopeOfWork || undefined,
    termsAndConditions: dbAnalysis.termsAndConditions || undefined,
    terminationClauses: dbAnalysis.terminationClauses || undefined,
    commercialTerms: dbAnalysis.commercialTerms || undefined,
    paymentSchedule: dbAnalysis.paymentSchedule || undefined,
    totalValue: dbAnalysis.totalValue || undefined,
    currency: dbAnalysis.currency || undefined,
    noticePeriod: dbAnalysis.noticePeriod || undefined,
    renewalTerms: dbAnalysis.renewalTerms || undefined,
    keyContacts: dbAnalysis.keyContacts || undefined,
    summary: dbAnalysis.summary || undefined,
    confidenceScores: (dbAnalysis.confidenceScores as Record<string, number>) || {},
    aiProvider: dbAnalysis.aiProvider || undefined,
    aiModel: dbAnalysis.aiModel || undefined,
    processingTimeMs: dbAnalysis.processingTimeMs || undefined,
    analyzedAt: dbAnalysis.analyzedAt,
  };
}

/**
 * Get existing analysis for a document
 */
export async function getDocumentAnalysis(
  documentId: string
): Promise<VendorDocumentAnalysis | null> {
  const analysis = await prisma.vendorDocumentAnalysis.findUnique({
    where: { documentId },
  });

  if (!analysis) {
    return null;
  }

  return transformAnalysis(analysis);
}

/**
 * Delete analysis for a document
 */
export async function deleteDocumentAnalysis(
  documentId: string
): Promise<boolean> {
  try {
    await prisma.vendorDocumentAnalysis.delete({
      where: { documentId },
    });
    return true;
  } catch {
    return false;
  }
}
