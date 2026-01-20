/**
 * Token Encryption Service
 *
 * Provides secure encryption/decryption for password reset and invitation tokens.
 * Uses AES-256-GCM encryption with time-based expiration for enhanced security.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

// ============================================================================
// ENCRYPTION CONFIGURATION
// ============================================================================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TOKEN_SEPARATOR = ':';

/**
 * Get encryption key from environment
 * Uses the same key as email encryption for consistency
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.EMAIL_ENCRYPTION_KEY || process.env.AI_ENCRYPTION_KEY;
  if (envKey) {
    return createHash('sha256').update(envKey).digest();
  }
  // Fallback to DATABASE_URL for development
  const fallbackKey = process.env.DATABASE_URL || 'default-insecure-key';
  return createHash('sha256').update(fallbackKey).digest();
}

// ============================================================================
// TOKEN DATA INTERFACE
// ============================================================================

export interface TokenData {
  email: string;
  type: 'invitation' | 'reset';
  userId: string;
  createdAt: number; // Unix timestamp
}

// ============================================================================
// ENCRYPTION FUNCTIONS
// ============================================================================

/**
 * Encrypt token data for use in URLs
 * Returns a URL-safe base64 encoded string
 */
export function encryptToken(data: TokenData): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const jsonData = JSON.stringify(data);
  let encrypted = cipher.update(jsonData, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine: iv:authTag:encryptedData
  const combined = `${iv.toString('hex')}${TOKEN_SEPARATOR}${authTag.toString('hex')}${TOKEN_SEPARATOR}${encrypted}`;

  // Convert to URL-safe base64
  return Buffer.from(combined).toString('base64url');
}

/**
 * Decrypt a token from URL parameter
 * Returns the original token data or null if invalid
 */
export function decryptToken(encryptedToken: string): TokenData | null {
  try {
    const key = getEncryptionKey();

    // Decode from URL-safe base64
    const combined = Buffer.from(encryptedToken, 'base64url').toString('utf8');
    const parts = combined.split(TOKEN_SEPARATOR);

    if (parts.length !== 3) {
      console.error('Invalid token format: wrong number of parts');
      return null;
    }

    const [ivHex, authTagHex, encryptedData] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const data = JSON.parse(decrypted) as TokenData;

    // Validate the data structure
    if (!data.email || !data.type || !data.userId || !data.createdAt) {
      console.error('Invalid token data: missing required fields');
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to decrypt token:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Generate a unique random token for database storage
 */
export function generateRandomToken(): string {
  return randomBytes(32).toString('hex');
}

// ============================================================================
// TOKEN VALIDATION
// ============================================================================

/**
 * Check if a token has expired based on creation time
 * @param createdAt - Unix timestamp when token was created
 * @param expirationHours - Hours until expiration (default: 48 for invitations, 2 for resets)
 */
export function isTokenExpired(createdAt: number, expirationHours: number = 48): boolean {
  const now = Date.now();
  const expirationTime = createdAt + (expirationHours * 60 * 60 * 1000);
  return now > expirationTime;
}

/**
 * Get expiration time for a token type
 */
export function getTokenExpirationHours(type: 'invitation' | 'reset'): number {
  // Invitations last 48 hours, password resets last 2 hours
  return type === 'invitation' ? 48 : 2;
}

/**
 * Calculate expiration date for a token
 */
export function getTokenExpirationDate(type: 'invitation' | 'reset'): Date {
  const hours = getTokenExpirationHours(type);
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

// ============================================================================
// URL GENERATION
// ============================================================================

/**
 * Generate a password setup URL with encrypted token
 */
export function generatePasswordSetupUrl(
  baseUrl: string,
  email: string,
  userId: string,
  type: 'invitation' | 'reset'
): string {
  const tokenData: TokenData = {
    email,
    userId,
    type,
    createdAt: Date.now(),
  };

  const encryptedToken = encryptToken(tokenData);
  const url = new URL('/auth/setup-password', baseUrl);
  url.searchParams.set('token', encryptedToken);

  return url.toString();
}

/**
 * Extract and validate token from URL
 * Returns null if token is missing, invalid, or expired
 */
export function extractAndValidateToken(
  tokenParam: string | null,
  expectedType?: 'invitation' | 'reset'
): TokenData | null {
  if (!tokenParam) {
    return null;
  }

  const tokenData = decryptToken(tokenParam);

  if (!tokenData) {
    return null;
  }

  // Check type if specified
  if (expectedType && tokenData.type !== expectedType) {
    console.error(`Token type mismatch: expected ${expectedType}, got ${tokenData.type}`);
    return null;
  }

  // Check expiration
  const expirationHours = getTokenExpirationHours(tokenData.type);
  if (isTokenExpired(tokenData.createdAt, expirationHours)) {
    console.error('Token has expired');
    return null;
  }

  return tokenData;
}
