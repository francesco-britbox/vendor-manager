/**
 * Storage Module
 *
 * Re-exports all storage-related functionality.
 */

export {
  // Configuration
  getS3Config,
  isS3Configured,
  getS3Client,

  // File operations
  uploadFile,
  downloadFile,
  deleteFile,
  fileExists,
  getFileMetadata,
  generateFileKey,

  // Presigned URLs
  getPresignedDownloadUrl,
  getPresignedUploadUrl,

  // Validation
  getMaxFileSize,
  validateFile,
  ALLOWED_FILE_TYPES,
  ALLOWED_EXTENSIONS,
  FILE_TYPE_LABELS,

  // Types
  type S3Config,
  type UploadResult,
  type UploadOptions,
  type FileValidationResult,
} from './s3-client';
