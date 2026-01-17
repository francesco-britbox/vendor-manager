/**
 * Storage Module
 *
 * Re-exports all storage-related functionality.
 *
 * MIGRATION NOTE: Document storage has been migrated from AWS S3 to database storage.
 * The S3 client functions are kept for backward compatibility and migration purposes.
 * New code should use the database storage functions.
 */

// ============================================================================
// DATABASE STORAGE (Primary - Use these for new code)
// ============================================================================
export {
  // Configuration
  isStorageConfigured,
  getMaxFileSize,
  generateDocumentKey,

  // Vendor Document Operations
  uploadVendorDocument,
  downloadVendorDocument,
  downloadVendorDocumentByKey,
  deleteVendorDocumentData,
  vendorDocumentExists,

  // Contract Document Operations
  uploadContractDocument,
  downloadContractDocument,
  downloadContractDocumentByKey,
  deleteContractDocumentData,
  contractDocumentExists,

  // Unified Download (backward compatible with AI pipeline)
  downloadFile,

  // Migration Helpers
  getDocumentsPendingMigration,
  migrateVendorDocumentFromS3,
  migrateContractFromS3,
  getStorageStats,

  // Validation
  validateFile,
  ALLOWED_FILE_TYPES,
  EXTENDED_ALLOWED_FILE_TYPES,
  ALLOWED_EXTENSIONS,
  EXTENDED_ALLOWED_EXTENSIONS,
  FILE_TYPE_LABELS,

  // Types
  type StorageType,
  type UploadResult,
  type UploadOptions,
  type DownloadResult,
  type FileValidationResult,
} from './db-storage';

// ============================================================================
// S3 STORAGE (Deprecated - Only for migration purposes)
// ============================================================================
export {
  // Configuration (deprecated)
  getS3Config,
  isS3Configured,
  getS3Client,

  // File operations (deprecated - use database storage instead)
  uploadFile as uploadFileToS3,
  downloadFile as downloadFileFromS3,
  deleteFile as deleteFileFromS3,
  fileExists as fileExistsInS3,
  getFileMetadata as getFileMetadataFromS3,
  generateFileKey as generateS3FileKey,

  // Presigned URLs (deprecated)
  getPresignedDownloadUrl,
  getPresignedUploadUrl,

  // Types (deprecated)
  type S3Config,
  type UploadResult as S3UploadResult,
  type UploadOptions as S3UploadOptions,
  type FileValidationResult as S3FileValidationResult,
} from './s3-client';
