/**
 * Contract Analyzer Service
 *
 * Orchestrates the full contract analysis pipeline:
 * 1. Fetch document from database (or S3 for legacy documents)
 * 2. Extract text from PDF
 * 3. Analyze with AI
 * 4. Store results in database
 */

import { prisma } from '@/lib/prisma';
import {
  downloadFileFromS3,
  isS3Configured,
} from '@/lib/storage';
import { extractTextFromPDF, isPDFBuffer } from '@/lib/pdf-extraction';
import { analyzeContract, isAIConfigured, getConfiguredProvider, type AIAnalysisOptions } from '@/lib/ai-analysis';
import type { ContractAnalysis } from '@/types';

/**
 * Result of contract analysis operation
 */
export interface ContractAnalysisResult {
  success: boolean;
  analysis?: ContractAnalysis;
  error?: string;
  details?: {
    provider?: string;
    textLength?: number;
    pageCount?: number;
    processingTime?: number;
  };
}

/**
 * Options for contract analysis
 */
export interface ContractAnalyzerOptions extends AIAnalysisOptions {
  /** Force re-analysis even if analysis exists */
  force?: boolean;
}

/**
 * Analyze a contract document by ID
 *
 * @param contractId - The contract ID
 * @param options - Analysis options
 * @returns Analysis result
 */
export async function analyzeContractDocument(
  contractId: string,
  options: ContractAnalyzerOptions = {}
): Promise<ContractAnalysisResult> {
  const startTime = Date.now();

  try {
    // Check if AI is configured
    if (!isAIConfigured()) {
      return {
        success: false,
        error: 'AI analysis is not configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.',
      };
    }

    // Get contract with document info including binary data
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: {
        id: true,
        documentKey: true,
        documentData: true,
        documentType: true,
        documentName: true,
        storageType: true,
        aiAnalysis: true,
      },
    });

    if (!contract) {
      return {
        success: false,
        error: 'Contract not found',
      };
    }

    // Check if document exists
    if (!contract.documentKey && !contract.documentData) {
      return {
        success: false,
        error: 'No document attached to this contract',
      };
    }

    // Check if analysis already exists and force is not set
    if (contract.aiAnalysis && !options.force) {
      return {
        success: true,
        analysis: transformAnalysis(contract.aiAnalysis),
        details: {
          provider: 'cached',
        },
      };
    }

    // Check document type (only PDF supported for now)
    if (contract.documentType !== 'application/pdf') {
      return {
        success: false,
        error: `Document type "${contract.documentType}" is not supported for AI analysis. Please upload a PDF document.`,
      };
    }

    let pdfBuffer: Buffer;

    // Download document from database or S3 based on storage type
    if (contract.storageType === 'database' && contract.documentData) {
      // Document is stored in database
      pdfBuffer = Buffer.from(contract.documentData);
    } else if (contract.documentKey) {
      // Document is stored in S3 (legacy)
      if (!isS3Configured()) {
        return {
          success: false,
          error: 'Document is stored in S3 but S3 is not configured. Please run migration.',
        };
      }
      const fileData = await downloadFileFromS3(contract.documentKey);
      pdfBuffer = Buffer.from(fileData.body);
    } else {
      return {
        success: false,
        error: 'Document data not found',
      };
    }

    // Verify it's a valid PDF
    if (!isPDFBuffer(pdfBuffer)) {
      return {
        success: false,
        error: 'The document is not a valid PDF file',
      };
    }

    // Extract text from PDF
    const extractionResult = await extractTextFromPDF(pdfBuffer);

    if (!extractionResult.success) {
      return {
        success: false,
        error: `Failed to extract text from PDF: ${extractionResult.error}`,
      };
    }

    if (!extractionResult.text || extractionResult.text.length < 50) {
      return {
        success: false,
        error: 'The document does not contain enough extractable text. It may be a scanned document or image-based PDF.',
      };
    }

    // Analyze with AI
    const provider = getConfiguredProvider();
    const aiAnalysis = await analyzeContract(extractionResult.text, options);

    // Store analysis in database
    const now = new Date();
    const dbAnalysis = await prisma.contractAnalysis.upsert({
      where: { contractId },
      create: {
        contractId,
        expirationDate: aiAnalysis.expirationDate || null,
        renewalTerms: aiAnalysis.renewalTerms || null,
        sla: aiAnalysis.sla || null,
        paymentTerms: aiAnalysis.paymentTerms || null,
        noticePeriod: aiAnalysis.noticePeriod || null,
        keyContacts: aiAnalysis.keyContacts || null,
        scopeSummary: aiAnalysis.scopeSummary || null,
        terminationClauses: aiAnalysis.terminationClauses || null,
        confidenceScores: aiAnalysis.confidenceScores,
        analyzedAt: now,
      },
      update: {
        expirationDate: aiAnalysis.expirationDate || null,
        renewalTerms: aiAnalysis.renewalTerms || null,
        sla: aiAnalysis.sla || null,
        paymentTerms: aiAnalysis.paymentTerms || null,
        noticePeriod: aiAnalysis.noticePeriod || null,
        keyContacts: aiAnalysis.keyContacts || null,
        scopeSummary: aiAnalysis.scopeSummary || null,
        terminationClauses: aiAnalysis.terminationClauses || null,
        confidenceScores: aiAnalysis.confidenceScores,
        analyzedAt: now,
      },
    });

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      analysis: transformAnalysis(dbAnalysis),
      details: {
        provider: provider || undefined,
        textLength: extractionResult.text.length,
        pageCount: extractionResult.pageCount,
        processingTime,
      },
    };
  } catch (error) {
    console.error('Contract analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred during analysis',
    };
  }
}

/**
 * Get existing analysis for a contract
 */
export async function getContractAnalysis(
  contractId: string
): Promise<ContractAnalysis | null> {
  const analysis = await prisma.contractAnalysis.findUnique({
    where: { contractId },
  });

  if (!analysis) {
    return null;
  }

  return transformAnalysis(analysis);
}

/**
 * Delete analysis for a contract
 */
export async function deleteContractAnalysis(
  contractId: string
): Promise<boolean> {
  try {
    await prisma.contractAnalysis.delete({
      where: { contractId },
    });
    return true;
  } catch (error) {
    // If analysis doesn't exist, that's fine
    return false;
  }
}

/**
 * Transform database analysis to API type
 */
function transformAnalysis(dbAnalysis: {
  expirationDate: string | null;
  renewalTerms: string | null;
  sla: string | null;
  paymentTerms: string | null;
  noticePeriod: string | null;
  keyContacts: string | null;
  scopeSummary: string | null;
  terminationClauses: string | null;
  confidenceScores: unknown;
  analyzedAt: Date;
}): ContractAnalysis {
  return {
    expirationDate: dbAnalysis.expirationDate || undefined,
    renewalTerms: dbAnalysis.renewalTerms || undefined,
    sla: dbAnalysis.sla || undefined,
    paymentTerms: dbAnalysis.paymentTerms || undefined,
    noticePeriod: dbAnalysis.noticePeriod || undefined,
    keyContacts: dbAnalysis.keyContacts || undefined,
    scopeSummary: dbAnalysis.scopeSummary || undefined,
    terminationClauses: dbAnalysis.terminationClauses || undefined,
    confidenceScores: (dbAnalysis.confidenceScores as Record<string, number>) || {},
    analyzedAt: dbAnalysis.analyzedAt,
  };
}

/**
 * Check if contract has been analyzed
 */
export async function hasContractAnalysis(contractId: string): Promise<boolean> {
  const count = await prisma.contractAnalysis.count({
    where: { contractId },
  });
  return count > 0;
}

/**
 * Get analysis status information
 */
export interface AnalysisStatusInfo {
  isConfigured: boolean;
  provider: string | null;
  hasAnalysis: boolean;
  analyzedAt?: Date;
}

export async function getAnalysisStatus(
  contractId: string
): Promise<AnalysisStatusInfo> {
  const analysis = await prisma.contractAnalysis.findUnique({
    where: { contractId },
    select: { analyzedAt: true },
  });

  return {
    isConfigured: isAIConfigured(),
    provider: getConfiguredProvider(),
    hasAnalysis: !!analysis,
    analyzedAt: analysis?.analyzedAt,
  };
}
