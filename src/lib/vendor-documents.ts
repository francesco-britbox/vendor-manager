/**
 * Vendor Document Service
 *
 * Manages vendor document CRUD operations with Zod validation.
 * Provides data access functions for the VendorDocument model.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { VendorDocument, VendorDocumentAnalysis, DocumentType } from '@/types';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Zod schema for document type
 */
export const documentTypeSchema = z.enum([
  'CONTRACT',
  'SOW',
  'SLA',
  'NDA',
  'MSA',
  'AMENDMENT',
  'ADDENDUM',
  'INVOICE',
  'PROPOSAL',
  'INSURANCE',
  'COMPLIANCE',
  'OTHER',
]);

/**
 * Zod schema for creating a vendor document
 */
export const createVendorDocumentSchema = z.object({
  vendorId: z.string().min(1, 'Vendor ID is required'),
  documentType: documentTypeSchema.optional().default('OTHER'),
  title: z.string().max(255, 'Title must be at most 255 characters').optional(),
  description: z.string().max(5000, 'Description must be at most 5000 characters').optional(),
  documentKey: z.string().min(1, 'Document key is required'),
  documentName: z.string().min(1, 'Document name is required'),
  documentSize: z.number().int().positive('Document size must be positive'),
  documentMimeType: z.string().min(1, 'Document MIME type is required'),
  enableAiExtraction: z.boolean().optional().default(true),
  documentDate: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
  expiryDate: z
    .string()
    .transform((val) => (val ? new Date(val) : undefined))
    .optional(),
});

/**
 * Zod schema for updating a vendor document
 */
export const updateVendorDocumentSchema = z.object({
  documentType: documentTypeSchema.optional(),
  title: z.string().max(255, 'Title must be at most 255 characters').optional().nullable(),
  description: z.string().max(5000, 'Description must be at most 5000 characters').optional().nullable(),
  documentDate: z
    .string()
    .transform((val) => (val ? new Date(val) : null))
    .optional()
    .nullable(),
  expiryDate: z
    .string()
    .transform((val) => (val ? new Date(val) : null))
    .optional()
    .nullable(),
});

/**
 * Zod schema for document ID parameter
 */
export const documentIdSchema = z.string().cuid('Invalid document ID format');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input type for creating a vendor document
 */
export type CreateVendorDocumentInput = z.infer<typeof createVendorDocumentSchema>;

/**
 * Input type for updating a vendor document
 */
export type UpdateVendorDocumentInput = z.infer<typeof updateVendorDocumentSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate vendor document input using Zod schema
 */
export function validateCreateVendorDocumentInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: CreateVendorDocumentInput;
} {
  const result = createVendorDocumentSchema.safeParse(input);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      data: result.data,
    };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join('.')}: ${issue.message}`
        : issue.message
    ),
  };
}

/**
 * Validate vendor document update input using Zod schema
 */
export function validateUpdateVendorDocumentInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: UpdateVendorDocumentInput;
} {
  const result = updateVendorDocumentSchema.safeParse(input);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      data: result.data,
    };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join('.')}: ${issue.message}`
        : issue.message
    ),
  };
}

/**
 * Validate document ID
 */
export function validateDocumentId(id: unknown): {
  valid: boolean;
  errors: string[];
  data?: string;
} {
  const result = documentIdSchema.safeParse(id);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      data: result.data,
    };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) => issue.message),
  };
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

/**
 * Transform database document to API type
 */
function transformDocument(dbDocument: {
  id: string;
  vendorId: string;
  documentType: string;
  title: string | null;
  description: string | null;
  documentKey: string;
  documentName: string;
  documentSize: number;
  documentMimeType: string;
  enableAiExtraction: boolean;
  extractionStatus: string | null;
  extractionError: string | null;
  documentDate: Date | null;
  expiryDate: Date | null;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  aiAnalysis?: {
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
  } | null;
}): VendorDocument {
  return {
    id: dbDocument.id,
    vendorId: dbDocument.vendorId,
    documentType: dbDocument.documentType as DocumentType,
    title: dbDocument.title || undefined,
    description: dbDocument.description || undefined,
    documentKey: dbDocument.documentKey,
    documentName: dbDocument.documentName,
    documentSize: dbDocument.documentSize,
    documentMimeType: dbDocument.documentMimeType,
    enableAiExtraction: dbDocument.enableAiExtraction,
    extractionStatus: dbDocument.extractionStatus || undefined,
    extractionError: dbDocument.extractionError || undefined,
    documentDate: dbDocument.documentDate || undefined,
    expiryDate: dbDocument.expiryDate || undefined,
    uploadedAt: dbDocument.uploadedAt,
    createdAt: dbDocument.createdAt,
    updatedAt: dbDocument.updatedAt,
    aiAnalysis: dbDocument.aiAnalysis
      ? transformAnalysis(dbDocument.aiAnalysis)
      : undefined,
  };
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

// ============================================================================
// DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all documents for a vendor
 */
export async function getVendorDocuments(vendorId: string): Promise<VendorDocument[]> {
  const documents = await prisma.vendorDocument.findMany({
    where: { vendorId },
    include: {
      aiAnalysis: true,
    },
    orderBy: [{ uploadedAt: 'desc' }],
  });

  return documents.map(transformDocument);
}

/**
 * Get documents with optional filtering
 */
export async function getDocuments(options?: {
  vendorId?: string;
  documentType?: DocumentType;
  search?: string;
  expiringWithinDays?: number;
  limit?: number;
  offset?: number;
}): Promise<{ documents: VendorDocument[]; total: number }> {
  const where: {
    vendorId?: string;
    documentType?: DocumentType;
    expiryDate?: { lte: Date; gte: Date };
    OR?: Array<
      | { title: { contains: string; mode: 'insensitive' } }
      | { documentName: { contains: string; mode: 'insensitive' } }
      | { description: { contains: string; mode: 'insensitive' } }
    >;
  } = {};

  if (options?.vendorId) {
    where.vendorId = options.vendorId;
  }

  if (options?.documentType) {
    where.documentType = options.documentType;
  }

  if (options?.search) {
    where.OR = [
      { title: { contains: options.search, mode: 'insensitive' } },
      { documentName: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  if (options?.expiringWithinDays) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + options.expiringWithinDays);
    where.expiryDate = { gte: today, lte: futureDate };
  }

  const [documents, total] = await Promise.all([
    prisma.vendorDocument.findMany({
      where,
      include: {
        aiAnalysis: true,
      },
      orderBy: [{ uploadedAt: 'desc' }],
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.vendorDocument.count({ where }),
  ]);

  return {
    documents: documents.map(transformDocument),
    total,
  };
}

/**
 * Get a document by ID
 */
export async function getDocumentById(id: string): Promise<VendorDocument | null> {
  const document = await prisma.vendorDocument.findUnique({
    where: { id },
    include: {
      aiAnalysis: true,
    },
  });

  return document ? transformDocument(document) : null;
}

/**
 * Create a new vendor document
 */
export async function createVendorDocument(
  input: CreateVendorDocumentInput
): Promise<VendorDocument> {
  const document = await prisma.vendorDocument.create({
    data: {
      vendorId: input.vendorId,
      documentType: input.documentType,
      title: input.title ?? null,
      description: input.description ?? null,
      documentKey: input.documentKey,
      documentName: input.documentName,
      documentSize: input.documentSize,
      documentMimeType: input.documentMimeType,
      enableAiExtraction: input.enableAiExtraction,
      extractionStatus: input.enableAiExtraction ? 'pending' : null,
      documentDate: input.documentDate ?? null,
      expiryDate: input.expiryDate ?? null,
    },
    include: {
      aiAnalysis: true,
    },
  });

  return transformDocument(document);
}

/**
 * Update a vendor document
 */
export async function updateVendorDocument(
  id: string,
  input: UpdateVendorDocumentInput
): Promise<VendorDocument | null> {
  // Check if document exists
  const existing = await prisma.vendorDocument.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const document = await prisma.vendorDocument.update({
    where: { id },
    data: {
      ...(input.documentType !== undefined && { documentType: input.documentType }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.documentDate !== undefined && { documentDate: input.documentDate }),
      ...(input.expiryDate !== undefined && { expiryDate: input.expiryDate }),
    },
    include: {
      aiAnalysis: true,
    },
  });

  return transformDocument(document);
}

/**
 * Delete a vendor document
 */
export async function deleteVendorDocument(id: string): Promise<boolean> {
  try {
    await prisma.vendorDocument.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Update extraction status
 */
export async function updateExtractionStatus(
  id: string,
  status: string,
  error?: string
): Promise<void> {
  await prisma.vendorDocument.update({
    where: { id },
    data: {
      extractionStatus: status,
      extractionError: error ?? null,
    },
  });
}

/**
 * Get document statistics
 */
export async function getDocumentStats(vendorId?: string): Promise<{
  totalDocuments: number;
  byType: Record<string, number>;
  expiringWithin30Days: number;
  withAnalysis: number;
  pendingAnalysis: number;
  totalSize: number;
}> {
  const where = vendorId ? { vendorId } : {};

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    total,
    byTypeRaw,
    expiringSoon,
    withAnalysis,
    pendingAnalysis,
    sizeResult,
  ] = await Promise.all([
    prisma.vendorDocument.count({ where }),
    prisma.vendorDocument.groupBy({
      by: ['documentType'],
      where,
      _count: true,
    }),
    prisma.vendorDocument.count({
      where: {
        ...where,
        expiryDate: {
          gte: today,
          lte: thirtyDaysFromNow,
        },
      },
    }),
    prisma.vendorDocument.count({
      where: {
        ...where,
        aiAnalysis: { isNot: null },
      },
    }),
    prisma.vendorDocument.count({
      where: {
        ...where,
        enableAiExtraction: true,
        extractionStatus: 'pending',
      },
    }),
    prisma.vendorDocument.aggregate({
      where,
      _sum: {
        documentSize: true,
      },
    }),
  ]);

  const byType: Record<string, number> = {};
  for (const item of byTypeRaw) {
    byType[item.documentType] = item._count;
  }

  return {
    totalDocuments: total,
    byType,
    expiringWithin30Days: expiringSoon,
    withAnalysis,
    pendingAnalysis,
    totalSize: sizeResult._sum.documentSize || 0,
  };
}

/**
 * Get documents expiring soon
 */
export async function getExpiringDocuments(
  days: number = 30,
  vendorId?: string
): Promise<VendorDocument[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where = {
    ...(vendorId && { vendorId }),
    expiryDate: {
      gte: today,
      lte: futureDate,
    },
  };

  const documents = await prisma.vendorDocument.findMany({
    where,
    include: {
      aiAnalysis: true,
    },
    orderBy: [{ expiryDate: 'asc' }],
  });

  return documents.map(transformDocument);
}
