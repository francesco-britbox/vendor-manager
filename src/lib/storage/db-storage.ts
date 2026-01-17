/**
 * Database Storage Client
 *
 * Provides database-based document storage operations.
 * This replaces AWS S3 storage with direct database BLOB storage.
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Maximum file size in bytes (from env or default 25MB)
 * Note: PostgreSQL has a 1GB limit for bytea columns, but we keep a reasonable default
 */
export function getMaxFileSize(): number {
  const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10);
  return maxSizeMB * 1024 * 1024;
}

/**
 * Check if database storage is configured (always true for database storage)
 */
export function isStorageConfigured(): boolean {
  return true; // Database storage is always available if the database is connected
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Storage type enum
 */
export type StorageType = 'database' | 's3';

/**
 * Upload result containing the document info
 */
export interface UploadResult {
  key: string; // Unique identifier for the document
  size: number;
  contentType: string;
  storageType: StorageType;
}

/**
 * Upload options
 */
export interface UploadOptions {
  /** Content type/MIME type of the file */
  contentType?: string;
  /** Additional metadata to store with the file */
  metadata?: Record<string, string>;
  /** Folder/prefix to use for the document key (for organizational purposes) */
  folder?: string;
}

/**
 * Download result
 */
export interface DownloadResult {
  body: Uint8Array;
  contentType: string;
  size: number;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Allowed file types for contract documents
 */
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

/**
 * Extended file types for vendor documents (includes images)
 */
export const EXTENDED_ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

/**
 * File type labels for display
 */
export const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'Word Document',
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
  'image/gif': 'GIF Image',
  'image/webp': 'WebP Image',
};

/**
 * File extensions for validation
 */
export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

/**
 * Extended file extensions for vendor documents
 */
export const EXTENDED_ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
];

/**
 * Validate file for upload
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  file: { size: number; type: string; name: string },
  options?: { allowImages?: boolean }
): FileValidationResult {
  const maxSize = getMaxFileSize();
  const allowedTypes = options?.allowImages
    ? EXTENDED_ALLOWED_FILE_TYPES
    : ALLOWED_FILE_TYPES;
  const allowedExtensions = options?.allowImages
    ? EXTENDED_ALLOWED_EXTENSIONS
    : ALLOWED_EXTENSIONS;

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds the maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  // Check file type
  if (!(allowedTypes as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: PDF, Word documents${options?.allowImages ? ', Images (JPG, PNG, GIF, WebP)' : ''}`,
    };
  }

  // Check file extension
  const extension = file.name
    .substring(file.name.lastIndexOf('.'))
    .toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension "${extension}" is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
}

// ============================================================================
// KEY GENERATION
// ============================================================================

/**
 * Generate a unique document key for storage
 */
export function generateDocumentKey(
  originalName: string,
  folder?: string
): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const sanitizedName = originalName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-');

  const key = `${timestamp}-${randomId}-${sanitizedName}`;

  return folder ? `${folder}/${key}` : key;
}

// ============================================================================
// VENDOR DOCUMENT OPERATIONS
// ============================================================================

/**
 * Upload a vendor document to database
 */
export async function uploadVendorDocument(
  vendorId: string,
  fileBuffer: Buffer,
  fileName: string,
  options: UploadOptions = {}
): Promise<{
  uploadResult: UploadResult;
  documentId: string;
}> {
  const contentType = options.contentType || 'application/octet-stream';
  const key = generateDocumentKey(
    fileName,
    options.folder || `vendors/${vendorId}/documents`
  );

  // Create the document record with binary data
  const document = await prisma.vendorDocument.create({
    data: {
      vendorId,
      documentKey: key, // Keep for backward compatibility and identification
      documentData: fileBuffer, // Store binary data directly
      documentName: fileName,
      documentSize: fileBuffer.length,
      documentMimeType: contentType,
      storageType: 'database',
    },
    select: { id: true },
  });

  return {
    uploadResult: {
      key,
      size: fileBuffer.length,
      contentType,
      storageType: 'database',
    },
    documentId: document.id,
  };
}

/**
 * Download a vendor document from database
 */
export async function downloadVendorDocument(
  documentId: string
): Promise<DownloadResult> {
  const document = await prisma.vendorDocument.findUnique({
    where: { id: documentId },
    select: {
      documentData: true,
      documentMimeType: true,
      documentSize: true,
      storageType: true,
      documentKey: true,
    },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  // Check if document is stored in database
  if (document.storageType === 'database' && document.documentData) {
    return {
      body: new Uint8Array(document.documentData),
      contentType: document.documentMimeType,
      size: document.documentSize,
    };
  }

  // If stored in S3, throw an error indicating migration is needed
  if (document.storageType === 's3') {
    throw new Error(
      'Document is stored in S3. Please run the migration script to move it to database storage.'
    );
  }

  throw new Error('Document data not found');
}

/**
 * Download a vendor document by document key (for AI analysis pipeline compatibility)
 */
export async function downloadVendorDocumentByKey(
  documentKey: string
): Promise<DownloadResult> {
  const document = await prisma.vendorDocument.findFirst({
    where: { documentKey },
    select: {
      documentData: true,
      documentMimeType: true,
      documentSize: true,
      storageType: true,
    },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  // Check if document is stored in database
  if (document.storageType === 'database' && document.documentData) {
    return {
      body: new Uint8Array(document.documentData),
      contentType: document.documentMimeType,
      size: document.documentSize,
    };
  }

  // If stored in S3, throw an error indicating migration is needed
  if (document.storageType === 's3') {
    throw new Error(
      'Document is stored in S3. Please run the migration script to move it to database storage.'
    );
  }

  throw new Error('Document data not found');
}

/**
 * Delete a vendor document's binary data from database
 * Note: This clears the binary data but the document record is typically deleted separately
 */
export async function deleteVendorDocumentData(
  documentId: string
): Promise<void> {
  await prisma.vendorDocument.update({
    where: { id: documentId },
    data: {
      documentData: null,
    },
  });
}

/**
 * Check if a vendor document exists and has data
 */
export async function vendorDocumentExists(documentId: string): Promise<boolean> {
  const document = await prisma.vendorDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      documentData: true,
      storageType: true,
    },
  });

  if (!document) {
    return false;
  }

  return document.storageType === 'database'
    ? document.documentData !== null
    : true; // S3 documents assumed to exist if record exists
}

// ============================================================================
// CONTRACT DOCUMENT OPERATIONS
// ============================================================================

/**
 * Upload a contract document to database
 */
export async function uploadContractDocument(
  contractId: string,
  fileBuffer: Buffer,
  fileName: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const contentType = options.contentType || 'application/octet-stream';
  const key = generateDocumentKey(
    fileName,
    options.folder || `contracts/${contractId}`
  );

  // Update the contract record with binary data
  await prisma.contract.update({
    where: { id: contractId },
    data: {
      documentKey: key, // Keep for backward compatibility
      documentData: fileBuffer, // Store binary data directly
      documentName: fileName,
      documentSize: fileBuffer.length,
      documentType: contentType,
      documentUploadedAt: new Date(),
      storageType: 'database',
      documentUrl: null, // Clear external URL when uploading new document
    },
  });

  return {
    key,
    size: fileBuffer.length,
    contentType,
    storageType: 'database',
  };
}

/**
 * Download a contract document from database
 */
export async function downloadContractDocument(
  contractId: string
): Promise<DownloadResult> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      documentData: true,
      documentType: true,
      documentSize: true,
      storageType: true,
      documentKey: true,
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  if (!contract.documentType || !contract.documentSize) {
    throw new Error('No document available for this contract');
  }

  // Check if document is stored in database
  if (contract.storageType === 'database' && contract.documentData) {
    return {
      body: new Uint8Array(contract.documentData),
      contentType: contract.documentType,
      size: contract.documentSize,
    };
  }

  // If stored in S3, throw an error indicating migration is needed
  if (contract.storageType === 's3') {
    throw new Error(
      'Document is stored in S3. Please run the migration script to move it to database storage.'
    );
  }

  throw new Error('Document data not found');
}

/**
 * Download a contract document by document key (for AI analysis pipeline compatibility)
 */
export async function downloadContractDocumentByKey(
  documentKey: string
): Promise<DownloadResult> {
  const contract = await prisma.contract.findFirst({
    where: { documentKey },
    select: {
      documentData: true,
      documentType: true,
      documentSize: true,
      storageType: true,
    },
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  if (!contract.documentType || !contract.documentSize) {
    throw new Error('No document available for this contract');
  }

  // Check if document is stored in database
  if (contract.storageType === 'database' && contract.documentData) {
    return {
      body: new Uint8Array(contract.documentData),
      contentType: contract.documentType,
      size: contract.documentSize,
    };
  }

  // If stored in S3, throw an error indicating migration is needed
  if (contract.storageType === 's3') {
    throw new Error(
      'Document is stored in S3. Please run the migration script to move it to database storage.'
    );
  }

  throw new Error('Document data not found');
}

/**
 * Delete a contract document's binary data from database
 */
export async function deleteContractDocumentData(
  contractId: string
): Promise<void> {
  await prisma.contract.update({
    where: { id: contractId },
    data: {
      documentKey: null,
      documentData: null,
      documentName: null,
      documentSize: null,
      documentType: null,
      documentUploadedAt: null,
      storageType: null,
    },
  });
}

/**
 * Check if a contract has a document
 */
export async function contractDocumentExists(contractId: string): Promise<boolean> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      documentData: true,
      storageType: true,
      documentKey: true,
    },
  });

  if (!contract) {
    return false;
  }

  return contract.storageType === 'database'
    ? contract.documentData !== null
    : contract.documentKey !== null; // S3 documents have a key
}

// ============================================================================
// UNIFIED DOWNLOAD FUNCTION (for backward compatibility with AI pipeline)
// ============================================================================

/**
 * Download file by document key (works for both vendor documents and contracts)
 * This maintains backward compatibility with the AI analysis pipeline
 */
export async function downloadFile(documentKey: string): Promise<DownloadResult> {
  // Try to find as vendor document first
  try {
    return await downloadVendorDocumentByKey(documentKey);
  } catch {
    // If not found as vendor document, try contract
  }

  // Try to find as contract document
  try {
    return await downloadContractDocumentByKey(documentKey);
  } catch {
    // If not found as contract document either, throw error
  }

  throw new Error(`Document with key "${documentKey}" not found in database`);
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Get documents that need to be migrated from S3
 */
export async function getDocumentsPendingMigration(): Promise<{
  vendorDocuments: Array<{ id: string; documentKey: string }>;
  contracts: Array<{ id: string; documentKey: string }>;
}> {
  const [vendorDocuments, contracts] = await Promise.all([
    prisma.vendorDocument.findMany({
      where: {
        storageType: 's3',
        documentKey: { not: null },
      },
      select: {
        id: true,
        documentKey: true,
      },
    }),
    prisma.contract.findMany({
      where: {
        storageType: 's3',
        documentKey: { not: null },
      },
      select: {
        id: true,
        documentKey: true,
      },
    }),
  ]);

  return {
    vendorDocuments: vendorDocuments.map((d) => ({
      id: d.id,
      documentKey: d.documentKey!,
    })),
    contracts: contracts.map((c) => ({
      id: c.id,
      documentKey: c.documentKey!,
    })),
  };
}

/**
 * Update vendor document after migration from S3
 */
export async function migrateVendorDocumentFromS3(
  documentId: string,
  documentData: Buffer
): Promise<void> {
  await prisma.vendorDocument.update({
    where: { id: documentId },
    data: {
      documentData,
      storageType: 'database',
    },
  });
}

/**
 * Update contract after migration from S3
 */
export async function migrateContractFromS3(
  contractId: string,
  documentData: Buffer
): Promise<void> {
  await prisma.contract.update({
    where: { id: contractId },
    data: {
      documentData,
      storageType: 'database',
    },
  });
}

// ============================================================================
// STORAGE STATS
// ============================================================================

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  vendorDocuments: {
    total: number;
    inDatabase: number;
    inS3: number;
    totalSizeBytes: number;
  };
  contracts: {
    total: number;
    inDatabase: number;
    inS3: number;
    totalSizeBytes: number;
  };
}> {
  const [vendorStats, contractStats] = await Promise.all([
    prisma.vendorDocument.groupBy({
      by: ['storageType'],
      _count: true,
      _sum: { documentSize: true },
    }),
    prisma.contract.groupBy({
      by: ['storageType'],
      where: { documentKey: { not: null } },
      _count: true,
      _sum: { documentSize: true },
    }),
  ]);

  const vendorInDb = vendorStats.find((s) => s.storageType === 'database');
  const vendorInS3 = vendorStats.find((s) => s.storageType === 's3');
  const contractInDb = contractStats.find((s) => s.storageType === 'database');
  const contractInS3 = contractStats.find((s) => s.storageType === 's3');

  return {
    vendorDocuments: {
      total: (vendorInDb?._count ?? 0) + (vendorInS3?._count ?? 0),
      inDatabase: vendorInDb?._count ?? 0,
      inS3: vendorInS3?._count ?? 0,
      totalSizeBytes:
        (vendorInDb?._sum?.documentSize ?? 0) +
        (vendorInS3?._sum?.documentSize ?? 0),
    },
    contracts: {
      total: (contractInDb?._count ?? 0) + (contractInS3?._count ?? 0),
      inDatabase: contractInDb?._count ?? 0,
      inS3: contractInS3?._count ?? 0,
      totalSizeBytes:
        (contractInDb?._sum?.documentSize ?? 0) +
        (contractInS3?._sum?.documentSize ?? 0),
    },
  };
}
