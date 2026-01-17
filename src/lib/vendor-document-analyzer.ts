/**
 * Vendor Document Analyzer Service
 *
 * Orchestrates the full document analysis pipeline:
 * 1. Fetch document from database (or S3 for legacy documents)
 * 2. Extract text from PDF/images
 * 3. Analyze with AI using structured outputs for guaranteed schema compliance
 * 4. Store results in database
 * 5. Auto-populate document dates and vendor service description
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
 * JSON Schema for structured AI outputs
 * Ensures consistent response format with typed fields
 */
const DOCUMENT_ANALYSIS_SCHEMA = {
  name: 'document_analysis',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      contractStartDate: {
        type: ['string', 'null'],
        description: 'Contract/document start or effective date in ISO 8601 format (YYYY-MM-DD). Return null if not found.',
      },
      contractEndDate: {
        type: ['string', 'null'],
        description: 'Contract/document end or expiration date in ISO 8601 format (YYYY-MM-DD). Return null if not found.',
      },
      involvedEntities: {
        type: ['string', 'null'],
        description: 'All company/organization names mentioned, comma-separated. Return null if not found.',
      },
      slaDetails: {
        type: ['string', 'null'],
        description: 'Service Level Agreements mentioned (response times, uptime guarantees, etc.). Return null if not found.',
      },
      uptimeGuarantee: {
        type: ['string', 'null'],
        description: 'Specific uptime guarantee percentage (e.g., "99.9%"). Return null if not found.',
      },
      responseTime: {
        type: ['string', 'null'],
        description: 'Response time commitments (e.g., "24 hours", "4 business hours"). Return null if not found.',
      },
      scopeOfWork: {
        type: ['string', 'null'],
        description: 'Summary of the scope of work/services in 2-3 sentences. Return null if not found.',
      },
      termsAndConditions: {
        type: ['string', 'null'],
        description: 'Key terms and conditions summary. Return null if not found.',
      },
      terminationClauses: {
        type: ['string', 'null'],
        description: 'Conditions under which the agreement can be terminated. Return null if not found.',
      },
      commercialTerms: {
        type: ['string', 'null'],
        description: 'Pricing, payment terms, fees summary. Return null if not found.',
      },
      paymentSchedule: {
        type: ['string', 'null'],
        description: 'Payment due dates, frequency. Return null if not found.',
      },
      totalValue: {
        type: ['string', 'null'],
        description: 'Total contract/document value if mentioned. Return null if not found.',
      },
      currency: {
        type: ['string', 'null'],
        description: 'Currency code of monetary values (e.g., "GBP", "USD", "EUR"). Return null if not found.',
      },
      noticePeriod: {
        type: ['string', 'null'],
        description: 'Required notice period for termination or changes. Return null if not found.',
      },
      renewalTerms: {
        type: ['string', 'null'],
        description: 'Auto-renewal terms, renewal procedures. Return null if not found.',
      },
      keyContacts: {
        type: ['string', 'null'],
        description: 'Important contacts mentioned (names, roles, emails if available). Return null if not found.',
      },
      summary: {
        type: ['string', 'null'],
        description: 'Brief 2-3 sentence summary of the entire document. Return null if not found.',
      },
      confidenceScores: {
        type: 'object',
        description: 'Confidence scores (0.0 to 1.0) for each extracted field',
        properties: {
          contractStartDate: { type: 'number' },
          contractEndDate: { type: 'number' },
          involvedEntities: { type: 'number' },
          slaDetails: { type: 'number' },
          uptimeGuarantee: { type: 'number' },
          responseTime: { type: 'number' },
          scopeOfWork: { type: 'number' },
          termsAndConditions: { type: 'number' },
          terminationClauses: { type: 'number' },
          commercialTerms: { type: 'number' },
          paymentSchedule: { type: 'number' },
          totalValue: { type: 'number' },
          currency: { type: 'number' },
          noticePeriod: { type: 'number' },
          renewalTerms: { type: 'number' },
          keyContacts: { type: 'number' },
          summary: { type: 'number' },
        },
        required: [
          'contractStartDate', 'contractEndDate', 'involvedEntities', 'slaDetails',
          'uptimeGuarantee', 'responseTime', 'scopeOfWork', 'termsAndConditions',
          'terminationClauses', 'commercialTerms', 'paymentSchedule', 'totalValue',
          'currency', 'noticePeriod', 'renewalTerms', 'keyContacts', 'summary'
        ],
        additionalProperties: false,
      },
    },
    required: [
      'contractStartDate', 'contractEndDate', 'involvedEntities', 'slaDetails',
      'uptimeGuarantee', 'responseTime', 'scopeOfWork', 'termsAndConditions',
      'terminationClauses', 'commercialTerms', 'paymentSchedule', 'totalValue',
      'currency', 'noticePeriod', 'renewalTerms', 'keyContacts', 'summary',
      'confidenceScores'
    ],
    additionalProperties: false,
  },
} as const;

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
 * System prompt for vendor document analysis (used with structured outputs)
 */
const VENDOR_DOCUMENT_ANALYSIS_PROMPT = `You are an expert contract and document analyst. Analyze the provided document text and extract key information.

IMPORTANT DATE FORMAT: All dates must be in ISO 8601 format (YYYY-MM-DD). For example: "2025-12-31" not "December 31, 2025".

For each field you extract, assign a confidence score:
- 0.0: Information not found
- 0.1-0.7: Information partially found or unclear
- 0.8-1.0: Information clearly stated

Return null for any field where information cannot be found.`;

/**
 * AI Analysis result structure (matches schema)
 */
interface AIAnalysisData {
  contractStartDate: string | null;
  contractEndDate: string | null;
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
  confidenceScores: Record<string, number>;
}

/**
 * Database storage structure (maps AI fields to DB columns)
 */
interface DBAnalysisData {
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

    // Analyze with AI (returns structured data)
    const analysisData = await runAIAnalysis(
      extractionResult.text,
      provider,
      apiKey || (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY! : process.env.OPENAI_API_KEY!),
      model
    );

    const processingTime = Date.now() - startTime;

    // Map AI data to database format
    const dbData = mapToDBFormat(analysisData);

    // Store analysis in database
    const dbAnalysis = await prisma.vendorDocumentAnalysis.upsert({
      where: { documentId },
      create: {
        documentId,
        ...dbData,
        aiProvider: provider,
        aiModel: model,
        processingTimeMs: processingTime,
        analyzedAt: new Date(),
      },
      update: {
        ...dbData,
        aiProvider: provider,
        aiModel: model,
        processingTimeMs: processingTime,
        analyzedAt: new Date(),
      },
    });

    // Auto-populate document dates and vendor service description
    await autoPopulateFromAnalysis(documentId, document.vendorId, analysisData);

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
 * Analyze with Claude using structured outputs
 */
async function analyzeWithClaude(
  text: string,
  apiKey: string,
  model: string
): Promise<AIAnalysisData> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({
    apiKey,
    defaultHeaders: {
      'anthropic-beta': 'structured-outputs-2025-11-13',
    },
  });

  // Use tool with strict mode for guaranteed schema compliance
  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: VENDOR_DOCUMENT_ANALYSIS_PROMPT,
    tools: [{
      name: 'document_analysis',
      description: 'Extract and structure document information',
      input_schema: DOCUMENT_ANALYSIS_SCHEMA.schema,
      // @ts-expect-error - strict is a beta feature
      strict: true,
    }],
    tool_choice: { type: 'tool', name: 'document_analysis' },
    messages: [
      { role: 'user', content: `Analyze this document:\n\n${text}` },
    ],
  });

  const toolUse = response.content.find(block => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('No structured response from Claude');
  }

  return toolUse.input as AIAnalysisData;
}

/**
 * Analyze with OpenAI using structured outputs (json_schema)
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
    response_format: {
      type: 'json_schema',
      json_schema: DOCUMENT_ANALYSIS_SCHEMA,
    },
    messages: [
      { role: 'system', content: VENDOR_DOCUMENT_ANALYSIS_PROMPT },
      { role: 'user', content: `Analyze this document:\n\n${text}` },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  // With structured outputs, parsing should always succeed
  return JSON.parse(content) as AIAnalysisData;
}

/**
 * Map AI analysis data to database storage format
 */
function mapToDBFormat(data: AIAnalysisData): DBAnalysisData {
  return {
    // Map field names: AI uses contractStartDate/contractEndDate, DB uses contractCreationDate/expiryRenewalDate
    contractCreationDate: data.contractStartDate ?? undefined,
    expiryRenewalDate: data.contractEndDate ?? undefined,
    involvedEntities: data.involvedEntities ?? undefined,
    slaDetails: data.slaDetails ?? undefined,
    uptimeGuarantee: data.uptimeGuarantee ?? undefined,
    responseTime: data.responseTime ?? undefined,
    scopeOfWork: data.scopeOfWork ?? undefined,
    termsAndConditions: data.termsAndConditions ?? undefined,
    terminationClauses: data.terminationClauses ?? undefined,
    commercialTerms: data.commercialTerms ?? undefined,
    paymentSchedule: data.paymentSchedule ?? undefined,
    totalValue: data.totalValue ?? undefined,
    currency: data.currency ?? undefined,
    noticePeriod: data.noticePeriod ?? undefined,
    renewalTerms: data.renewalTerms ?? undefined,
    keyContacts: data.keyContacts ?? undefined,
    summary: data.summary ?? undefined,
    confidenceScores: normalizeConfidenceScores(data.confidenceScores),
  };
}

/**
 * Parse ISO date string to Date object
 */
function parseISODate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  // Try to parse ISO date (YYYY-MM-DD)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try general date parsing as fallback
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
}

/**
 * Auto-populate document dates and vendor service description
 */
async function autoPopulateFromAnalysis(
  documentId: string,
  vendorId: string,
  analysisData: AIAnalysisData
): Promise<void> {
  const updates: { documentDate?: Date; expiryDate?: Date } = {};

  console.log('[AutoPopulate] Starting auto-population for document:', documentId);
  console.log('[AutoPopulate] contractStartDate:', analysisData.contractStartDate);
  console.log('[AutoPopulate] contractEndDate:', analysisData.contractEndDate);
  console.log('[AutoPopulate] confidenceScores:', JSON.stringify(analysisData.confidenceScores));

  // Parse and set document start date if confidence is high enough (>= 0.7)
  const startConfidence = analysisData.confidenceScores?.contractStartDate;
  console.log('[AutoPopulate] Start date confidence:', startConfidence, 'passes threshold:', startConfidence >= 0.7);

  if (analysisData.contractStartDate && startConfidence >= 0.7) {
    const startDate = parseISODate(analysisData.contractStartDate);
    console.log('[AutoPopulate] Parsed start date:', startDate);
    if (startDate) {
      updates.documentDate = startDate;
    }
  }

  // Parse and set document end date if confidence is high enough (>= 0.7)
  const endConfidence = analysisData.confidenceScores?.contractEndDate;
  console.log('[AutoPopulate] End date confidence:', endConfidence, 'passes threshold:', endConfidence >= 0.7);

  if (analysisData.contractEndDate && endConfidence >= 0.7) {
    const endDate = parseISODate(analysisData.contractEndDate);
    console.log('[AutoPopulate] Parsed end date:', endDate);
    if (endDate) {
      updates.expiryDate = endDate;
    }
  }

  // Update document dates if any were extracted
  console.log('[AutoPopulate] Updates to apply:', updates);
  if (Object.keys(updates).length > 0) {
    await prisma.vendorDocument.update({
      where: { id: documentId },
      data: updates,
    });
    console.log('[AutoPopulate] Document updated successfully');
  } else {
    console.log('[AutoPopulate] No updates to apply');
  }

  // Update vendor fields
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      serviceDescription: true,
      contractStartDate: true,
      contractEndDate: true,
      tags: { include: { tag: true } },
    },
  });

  if (vendor) {
    const vendorUpdates: {
      serviceDescription?: string;
      contractStartDate?: Date;
      contractEndDate?: Date;
    } = {};

    // Update service description if scopeOfWork has high confidence and vendor doesn't have one
    if (analysisData.scopeOfWork && analysisData.confidenceScores.scopeOfWork >= 0.7) {
      if (!vendor.serviceDescription) {
        vendorUpdates.serviceDescription = analysisData.scopeOfWork;
        console.log('[AutoPopulate] Setting vendor serviceDescription');
      }
    }

    // Update vendor contract dates if confidence is high and dates were extracted
    if (analysisData.contractStartDate && analysisData.confidenceScores.contractStartDate >= 0.7) {
      const startDate = parseISODate(analysisData.contractStartDate);
      if (startDate) {
        // Only update if vendor doesn't have a date or new date is earlier
        if (!vendor.contractStartDate || startDate < vendor.contractStartDate) {
          vendorUpdates.contractStartDate = startDate;
          console.log('[AutoPopulate] Setting vendor contractStartDate:', startDate);
        }
      }
    }

    if (analysisData.contractEndDate && analysisData.confidenceScores.contractEndDate >= 0.7) {
      const endDate = parseISODate(analysisData.contractEndDate);
      if (endDate) {
        // Only update if vendor doesn't have a date or new date is later
        if (!vendor.contractEndDate || endDate > vendor.contractEndDate) {
          vendorUpdates.contractEndDate = endDate;
          console.log('[AutoPopulate] Setting vendor contractEndDate:', endDate);
        }
      }
    }

    // Apply vendor updates if any
    if (Object.keys(vendorUpdates).length > 0) {
      await prisma.vendor.update({
        where: { id: vendorId },
        data: vendorUpdates,
      });
      console.log('[AutoPopulate] Vendor updated with:', Object.keys(vendorUpdates));
    }

    // Auto-create tags from involved entities if confidence is high
    if (analysisData.involvedEntities && analysisData.confidenceScores.involvedEntities >= 0.7) {
      await autoCreateTagsFromEntities(vendorId, analysisData.involvedEntities, vendor.tags);
    }
  }
}

/**
 * Auto-create tags from involved entities
 */
async function autoCreateTagsFromEntities(
  vendorId: string,
  entities: string,
  existingTags: { tag: { name: string } }[]
): Promise<void> {
  // Parse entities (comma-separated)
  const entityNames = entities
    .split(',')
    .map(e => e.trim())
    .filter(e => e.length > 0 && e.length <= 50); // Filter out empty and too long

  if (entityNames.length === 0) return;

  const existingTagNames = new Set(existingTags.map(t => t.tag.name.toLowerCase()));

  for (const entityName of entityNames) {
    // Skip if tag already exists (case-insensitive)
    if (existingTagNames.has(entityName.toLowerCase())) {
      continue;
    }

    try {
      // Find or create the tag
      let tag = await prisma.tag.findFirst({
        where: { name: { equals: entityName, mode: 'insensitive' } },
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: { name: entityName },
        });
        console.log('[AutoPopulate] Created new tag:', entityName);
      }

      // Link tag to vendor
      await prisma.vendorTag.create({
        data: {
          vendorId,
          tagId: tag.id,
        },
      });
      console.log('[AutoPopulate] Linked tag to vendor:', entityName);
    } catch (error) {
      // Ignore duplicate key errors (tag already linked)
      console.log('[AutoPopulate] Tag error (may be duplicate):', entityName);
    }
  }
}

/**
 * Normalize confidence scores and map field names to DB format
 */
function normalizeConfidenceScores(scores: unknown): Record<string, number> {
  // Default scores using DB field names
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

  const scoresObj = scores as Record<string, unknown>;
  const result: Record<string, number> = {};

  // Map AI field names to DB field names for confidence scores
  const fieldMapping: Record<string, string> = {
    contractStartDate: 'contractCreationDate',
    contractEndDate: 'expiryRenewalDate',
  };

  for (const key of Object.keys(defaultScores)) {
    // Check if there's a mapping, otherwise use the key directly
    const aiKey = Object.entries(fieldMapping).find(([, dbKey]) => dbKey === key)?.[0] || key;
    const value = scoresObj[aiKey] ?? scoresObj[key];

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
