/**
 * S3 Storage Client
 *
 * @deprecated This module is deprecated. Document storage has been migrated to database storage.
 * Use the functions from '@/lib/storage/db-storage' instead.
 *
 * This module is kept for:
 * - Backward compatibility with legacy documents stored in S3
 * - Migration scripts that need to read from S3
 * - Fallback support during the transition period
 *
 * New uploads should use database storage via the main storage module exports.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * S3 configuration from environment variables
 */
export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string; // For S3-compatible services
}

/**
 * Get S3 configuration from environment variables
 */
export function getS3Config(): S3Config {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';
  const bucket = process.env.AWS_S3_BUCKET;
  const endpoint = process.env.AWS_S3_ENDPOINT; // Optional for S3-compatible services

  if (!accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      'Missing required S3 configuration. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET environment variables.'
    );
  }

  return {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    endpoint,
  };
}

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}

// ============================================================================
// S3 CLIENT
// ============================================================================

let s3Client: S3Client | null = null;

/**
 * Get or create S3 client singleton
 */
export function getS3Client(): S3Client {
  if (!s3Client) {
    const config = getS3Config();

    s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint && {
        endpoint: config.endpoint,
        forcePathStyle: true, // Required for S3-compatible services
      }),
    });
  }

  return s3Client;
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Upload result containing the file key and URL
 */
export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

/**
 * Upload options
 */
export interface UploadOptions {
  /** Custom key/path for the file. If not provided, one will be generated */
  key?: string;
  /** Content type/MIME type of the file */
  contentType?: string;
  /** Additional metadata to store with the file */
  metadata?: Record<string, string>;
  /** Folder/prefix to use for the file key */
  folder?: string;
}

/**
 * Generate a unique file key for storage
 */
export function generateFileKey(
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

/**
 * Upload a file to S3
 *
 * @deprecated Use database storage instead. This function is kept for backward compatibility.
 * New uploads should use the uploadVendorDocument or uploadContractDocument functions.
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  console.warn(
    '[DEPRECATED] uploadFile to S3 is deprecated. Use database storage instead.'
  );
  const config = getS3Config();
  const client = getS3Client();

  const key = options.key || generateFileKey(fileName, options.folder);
  const contentType = options.contentType || 'application/octet-stream';

  const putParams: PutObjectCommandInput = {
    Bucket: config.bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    Metadata: options.metadata,
  };

  await client.send(new PutObjectCommand(putParams));

  // Generate the public URL (or use presigned URL for private buckets)
  const url = config.endpoint
    ? `${config.endpoint}/${config.bucket}/${key}`
    : `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`;

  return {
    key,
    url,
    size: fileBuffer.length,
    contentType,
  };
}

/**
 * Download a file from S3
 *
 * @deprecated Use database storage instead. This function is kept for backward compatibility
 * and migration purposes. For new code, use downloadVendorDocument or downloadContractDocument.
 */
export async function downloadFile(key: string): Promise<{
  body: Uint8Array;
  contentType: string;
  size: number;
}> {
  const config = getS3Config();
  const client = getS3Client();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error('Empty response body from S3');
  }

  // Convert stream to Uint8Array (compatible with Web API Response)
  const chunks: Uint8Array[] = [];
  const stream = response.Body as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  // Calculate total length
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);

  // Combine chunks into single Uint8Array
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }

  return {
    body,
    contentType: response.ContentType || 'application/octet-stream',
    size: response.ContentLength || body.length,
  };
}

/**
 * Delete a file from S3
 *
 * @deprecated Use database storage instead. This function is kept for backward compatibility
 * to delete legacy documents stored in S3.
 */
export async function deleteFile(key: string): Promise<void> {
  const config = getS3Config();
  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
}

/**
 * Check if a file exists in S3
 */
export async function fileExists(key: string): Promise<boolean> {
  const config = getS3Config();
  const client = getS3Client();

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      error.name === 'NotFound'
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * Get file metadata from S3
 */
export async function getFileMetadata(key: string): Promise<{
  contentType: string;
  size: number;
  lastModified: Date | undefined;
  metadata: Record<string, string>;
}> {
  const config = getS3Config();
  const client = getS3Client();

  const response = await client.send(
    new HeadObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );

  return {
    contentType: response.ContentType || 'application/octet-stream',
    size: response.ContentLength || 0,
    lastModified: response.LastModified,
    metadata: response.Metadata || {},
  };
}

// ============================================================================
// PRESIGNED URLs
// ============================================================================

/**
 * Generate a presigned URL for downloading a file
 *
 * @deprecated Use database storage instead. Presigned URLs are only available for S3 storage.
 * For database storage, documents are served directly through the API endpoints.
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const config = getS3Config();
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a presigned URL for uploading a file
 *
 * @deprecated Use database storage instead. Presigned URLs are only available for S3 storage.
 * For database storage, documents are uploaded directly through the API endpoints.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const config = getS3Config();
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Maximum file size in bytes (from env or default 25MB)
 */
export function getMaxFileSize(): number {
  const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10);
  return maxSizeMB * 1024 * 1024;
}

/**
 * Allowed file types for contract documents
 */
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

/**
 * File type labels for display
 */
export const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'Word Document',
};

/**
 * File extensions for validation
 */
export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

/**
 * Validate file for upload
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  file: { size: number; type: string; name: string }
): FileValidationResult {
  const maxSize = getMaxFileSize();

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds the maximum allowed size of ${maxSizeMB}MB`,
    };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: PDF, Word documents`,
    };
  }

  // Check file extension
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `File extension "${extension}" is not allowed. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  return { valid: true };
}
