/**
 * Email Configuration Service
 *
 * Manages SMTP email configuration with encryption and provides secure access to email services.
 * Supports connection testing, email sending, rate limiting, and comprehensive audit logging.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { EmailConfig, EmailLog } from '@/types';

// ============================================================================
// ENCRYPTION UTILITIES
// ============================================================================

/**
 * Get encryption key from environment or generate one
 * In production, EMAIL_ENCRYPTION_KEY or AI_ENCRYPTION_KEY should be set
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.EMAIL_ENCRYPTION_KEY || process.env.AI_ENCRYPTION_KEY;
  if (envKey) {
    // Use SHA-256 hash of the env key to ensure 32 bytes
    return createHash('sha256').update(envKey).digest();
  }
  // Fallback to a key derived from DATABASE_URL for development
  // WARNING: Not ideal for production!
  const fallbackKey = process.env.DATABASE_URL || 'default-insecure-key';
  return createHash('sha256').update(fallbackKey).digest();
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
// AUTH_TAG_LENGTH is used implicitly by crypto for AES-256-GCM

/**
 * Encrypt a credential (username or password)
 */
export function encryptCredential(value: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a credential
 */
export function decryptCredential(encryptedValue: string): string {
  const key = getEncryptionKey();
  const parts = encryptedValue.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const [ivHex, authTagHex, encryptedData] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Mask a credential for display (show only asterisks)
 */
export function maskCredential(_value: string): string {
  return '••••••••';
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate SMTP host format
 */
export function validateSmtpHost(host: string): { valid: boolean; error?: string } {
  if (!host || typeof host !== 'string') {
    return { valid: false, error: 'SMTP server is required' };
  }

  const trimmed = host.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'SMTP server is required' };
  }

  // Check for valid hostname or IP address
  // Hostname regex: allows letters, numbers, hyphens, dots
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 regex (simplified)
  const ipv6Regex = /^\[?([a-fA-F0-9:]+)\]?$/;

  if (!hostnameRegex.test(trimmed) && !ipv4Regex.test(trimmed) && !ipv6Regex.test(trimmed)) {
    return { valid: false, error: 'Invalid SMTP server format. Enter a valid hostname or IP address.' };
  }

  return { valid: true };
}

/**
 * Validate SMTP port
 */
export function validateSmtpPort(port: number): { valid: boolean; error?: string } {
  if (port === undefined || port === null) {
    return { valid: false, error: 'Port is required' };
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { valid: false, error: 'Port must be a number between 1 and 65535' };
  }

  return { valid: true };
}

/**
 * Validate email address format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email address is required' };
  }

  const trimmed = email.trim();

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email address format' };
  }

  return { valid: true };
}

/**
 * Get recommended port for TLS setting
 */
export function getRecommendedPort(secure: boolean): number {
  return secure ? 465 : 587;
}

// ============================================================================
// SMTP CONNECTION TESTING
// ============================================================================

/**
 * Test SMTP connection with provided credentials
 */
export async function testSmtpConnection(config: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}): Promise<{ success: boolean; error?: string; details?: string }> {
  try {
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // Verify connection
    await transporter.verify();

    return { success: true, details: 'SMTP connection successful' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Parse common SMTP errors for user-friendly messages
    if (errorMessage.includes('ECONNREFUSED')) {
      return { success: false, error: 'Connection refused. Check the server address and port.' };
    }
    if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
      return { success: false, error: 'Connection timed out. Check the server address and port.' };
    }
    if (errorMessage.includes('ENOTFOUND')) {
      return { success: false, error: 'Server not found. Check the hostname.' };
    }
    if (errorMessage.includes('auth') || errorMessage.includes('535') || errorMessage.includes('534')) {
      return { success: false, error: 'Authentication failed. Check username and password.' };
    }
    if (errorMessage.includes('certificate')) {
      return { success: false, error: 'SSL/TLS certificate error. Try disabling TLS or check server certificate.' };
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Test SMTP connection with timeout handling
 */
export async function testSmtpConnectionWithTimeout(
  config: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  },
  timeoutMs: number = 30000
): Promise<{ success: boolean; error?: string; timeout?: boolean }> {
  return new Promise((resolve) => {
    let isResolved = false;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        resolve({ success: false, error: 'Connection test timed out', timeout: true });
      }
    }, timeoutMs);

    // Run the actual test
    testSmtpConnection(config)
      .then((result) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          resolve({ ...result, timeout: false });
        }
      })
      .catch((error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutId);
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timeout: false,
          });
        }
      });
  });
}

// ============================================================================
// EMAIL SENDING
// ============================================================================

/**
 * Send an email using the configured SMTP settings
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  userId?: string;
  module?: string;
  emailType?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const configWithCreds = await getEmailConfigWithCredentials();

  if (!configWithCreds) {
    return { success: false, error: 'Email service is not configured' };
  }

  const { config, username, password } = configWithCreds;

  if (!config.isEnabled) {
    return { success: false, error: 'Email service is disabled' };
  }

  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  // Validate all recipient emails
  for (const recipient of recipients) {
    const validation = validateEmail(recipient);
    if (!validation.valid) {
      return { success: false, error: `Invalid recipient email: ${recipient}` };
    }
  }

  try {
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: username,
        pass: password,
      },
    });

    const mailOptions = {
      from: config.fromName
        ? `"${config.fromName}" <${config.fromAddress}>`
        : config.fromAddress,
      to: recipients.join(', '),
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo || config.replyTo,
    };

    const info = await transporter.sendMail(mailOptions);

    // Log successful email
    await logEmail({
      recipient: recipients.join(', '),
      subject: options.subject,
      status: 'sent',
      messageId: info.messageId,
      userId: options.userId,
      module: options.module,
      emailType: options.emailType,
      metadata: options.metadata,
    });

    // Update usage count
    await incrementEmailUsageCount();

    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failed email
    await logEmail({
      recipient: recipients.join(', '),
      subject: options.subject,
      status: 'failed',
      errorMessage,
      userId: options.userId,
      module: options.module,
      emailType: options.emailType,
      metadata: options.metadata,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Send a test email
 */
export async function sendTestEmail(
  recipientEmail: string,
  config?: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromAddress: string;
    fromName?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Validate recipient email
  const validation = validateEmail(recipientEmail);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const nodemailer = await import('nodemailer');

    // Use provided config or get from database
    let smtpConfig: {
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
      fromAddress: string;
      fromName?: string;
    };

    if (config) {
      smtpConfig = config;
    } else {
      const configWithCreds = await getEmailConfigWithCredentials();
      if (!configWithCreds) {
        return { success: false, error: 'Email service is not configured' };
      }
      smtpConfig = {
        host: configWithCreds.config.host,
        port: configWithCreds.config.port,
        secure: configWithCreds.config.secure,
        username: configWithCreds.username,
        password: configWithCreds.password,
        fromAddress: configWithCreds.config.fromAddress,
        fromName: configWithCreds.config.fromName || undefined,
      };
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    });

    const mailOptions = {
      from: smtpConfig.fromName
        ? `"${smtpConfig.fromName}" <${smtpConfig.fromAddress}>`
        : smtpConfig.fromAddress,
      to: recipientEmail,
      subject: 'Test Email - Vendor Management System',
      text: `This is a test email from your Vendor Management System.

If you received this email, your SMTP configuration is working correctly.

Configuration Details:
- SMTP Server: ${smtpConfig.host}
- Port: ${smtpConfig.port}
- TLS: ${smtpConfig.secure ? 'Enabled' : 'Disabled'}
- From Address: ${smtpConfig.fromAddress}

This is an automated test message. No action is required.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
    .success { color: #10b981; font-weight: bold; }
    .details { background: white; padding: 15px; border-radius: 4px; margin-top: 20px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #666; }
    .value { font-weight: 500; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Test Email</h1>
      <p>Vendor Management System</p>
    </div>
    <div class="content">
      <p class="success">Your SMTP configuration is working correctly!</p>
      <p>This is a test email from your Vendor Management System. If you received this email, your email service has been configured successfully.</p>

      <div class="details">
        <h3>Configuration Details</h3>
        <div class="detail-row">
          <span class="label">SMTP Server</span>
          <span class="value">${smtpConfig.host}</span>
        </div>
        <div class="detail-row">
          <span class="label">Port</span>
          <span class="value">${smtpConfig.port}</span>
        </div>
        <div class="detail-row">
          <span class="label">TLS</span>
          <span class="value">${smtpConfig.secure ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div class="detail-row">
          <span class="label">From Address</span>
          <span class="value">${smtpConfig.fromAddress}</span>
        </div>
      </div>

      <div class="footer">
        <p>This is an automated test message. No action is required.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      </div>
    </div>
  </div>
</body>
</html>
`,
    };

    const info = await transporter.sendMail(mailOptions);

    // Log test email
    await logEmail({
      recipient: recipientEmail,
      subject: 'Test Email - Vendor Management System',
      status: 'sent',
      messageId: info.messageId,
      emailType: 'test',
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failed test email
    await logEmail({
      recipient: recipientEmail,
      subject: 'Test Email - Vendor Management System',
      status: 'failed',
      errorMessage,
      emailType: 'test',
    });

    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_EMAILS = 100; // 100 emails per hour per identifier

/**
 * Check if sending is allowed (rate limiting)
 */
export async function checkRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

  // Find or create rate limit record
  let rateLimit = await prisma.emailRateLimit.findUnique({
    where: { identifier },
  });

  if (!rateLimit || rateLimit.windowStart < windowStart) {
    // Create or reset the window
    rateLimit = await prisma.emailRateLimit.upsert({
      where: { identifier },
      create: {
        identifier,
        count: 0,
        windowStart: now,
      },
      update: {
        count: 0,
        windowStart: now,
      },
    });
  }

  const remaining = Math.max(0, RATE_LIMIT_MAX_EMAILS - rateLimit.count);
  const resetAt = new Date(rateLimit.windowStart.getTime() + RATE_LIMIT_WINDOW_MS);

  return {
    allowed: rateLimit.count < RATE_LIMIT_MAX_EMAILS,
    remaining,
    resetAt,
  };
}

/**
 * Increment rate limit counter
 */
export async function incrementRateLimit(identifier: string): Promise<void> {
  await prisma.emailRateLimit.upsert({
    where: { identifier },
    create: {
      identifier,
      count: 1,
      windowStart: new Date(),
    },
    update: {
      count: { increment: 1 },
    },
  });
}

// ============================================================================
// CONFIGURATION CRUD OPERATIONS
// ============================================================================

/**
 * Get email configuration (without exposing encrypted credentials)
 */
export async function getEmailConfig(): Promise<EmailConfig | null> {
  const config = await prisma.emailConfig.findFirst();

  if (!config) {
    return null;
  }

  return transformConfig(config);
}

/**
 * Get email configuration with decrypted credentials (internal use only)
 */
export async function getEmailConfigWithCredentials(): Promise<{
  config: EmailConfig;
  username: string;
  password: string;
} | null> {
  const config = await prisma.emailConfig.findFirst();

  if (!config) {
    return null;
  }

  try {
    return {
      config: transformConfig(config),
      username: decryptCredential(config.encryptedUsername),
      password: decryptCredential(config.encryptedPassword),
    };
  } catch (error) {
    console.error('Failed to decrypt email credentials:', error);
    return null;
  }
}

/**
 * Save or update email configuration
 */
export async function saveEmailConfig(data: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromAddress: string;
  fromName?: string;
  replyTo?: string;
  isEnabled?: boolean;
}): Promise<EmailConfig> {
  // Validate inputs
  const hostValidation = validateSmtpHost(data.host);
  if (!hostValidation.valid) {
    throw new Error(hostValidation.error);
  }

  const portValidation = validateSmtpPort(data.port);
  if (!portValidation.valid) {
    throw new Error(portValidation.error);
  }

  const fromValidation = validateEmail(data.fromAddress);
  if (!fromValidation.valid) {
    throw new Error(`From address: ${fromValidation.error}`);
  }

  if (data.replyTo) {
    const replyToValidation = validateEmail(data.replyTo);
    if (!replyToValidation.valid) {
      throw new Error(`Reply-to address: ${replyToValidation.error}`);
    }
  }

  // Encrypt credentials
  const encryptedUsername = encryptCredential(data.username);
  const encryptedPassword = encryptCredential(data.password);

  // Check if config exists
  const existing = await prisma.emailConfig.findFirst();

  let config;
  if (existing) {
    config = await prisma.emailConfig.update({
      where: { id: existing.id },
      data: {
        host: data.host.trim(),
        port: data.port,
        secure: data.secure,
        encryptedUsername,
        encryptedPassword,
        fromAddress: data.fromAddress.trim(),
        fromName: data.fromName?.trim() || null,
        replyTo: data.replyTo?.trim() || null,
        isEnabled: data.isEnabled ?? true,
      },
    });
  } else {
    config = await prisma.emailConfig.create({
      data: {
        host: data.host.trim(),
        port: data.port,
        secure: data.secure,
        encryptedUsername,
        encryptedPassword,
        fromAddress: data.fromAddress.trim(),
        fromName: data.fromName?.trim() || null,
        replyTo: data.replyTo?.trim() || null,
        isEnabled: data.isEnabled ?? true,
      },
    });
  }

  return transformConfig(config);
}

/**
 * Update email configuration settings (without changing credentials)
 */
export async function updateEmailConfigSettings(settings: {
  host?: string;
  port?: number;
  secure?: boolean;
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
  isEnabled?: boolean;
}): Promise<EmailConfig | null> {
  const existing = await prisma.emailConfig.findFirst();

  if (!existing) {
    return null;
  }

  // Validate updated values
  if (settings.host) {
    const hostValidation = validateSmtpHost(settings.host);
    if (!hostValidation.valid) {
      throw new Error(hostValidation.error);
    }
  }

  if (settings.port !== undefined) {
    const portValidation = validateSmtpPort(settings.port);
    if (!portValidation.valid) {
      throw new Error(portValidation.error);
    }
  }

  if (settings.fromAddress) {
    const fromValidation = validateEmail(settings.fromAddress);
    if (!fromValidation.valid) {
      throw new Error(`From address: ${fromValidation.error}`);
    }
  }

  if (settings.replyTo) {
    const replyToValidation = validateEmail(settings.replyTo);
    if (!replyToValidation.valid) {
      throw new Error(`Reply-to address: ${replyToValidation.error}`);
    }
  }

  const config = await prisma.emailConfig.update({
    where: { id: existing.id },
    data: {
      ...(settings.host && { host: settings.host.trim() }),
      ...(settings.port !== undefined && { port: settings.port }),
      ...(settings.secure !== undefined && { secure: settings.secure }),
      ...(settings.fromAddress && { fromAddress: settings.fromAddress.trim() }),
      ...(settings.fromName !== undefined && { fromName: settings.fromName?.trim() || null }),
      ...(settings.replyTo !== undefined && { replyTo: settings.replyTo?.trim() || null }),
      ...(settings.isEnabled !== undefined && { isEnabled: settings.isEnabled }),
    },
  });

  return transformConfig(config);
}

/**
 * Delete email configuration
 */
export async function deleteEmailConfig(): Promise<boolean> {
  try {
    const existing = await prisma.emailConfig.findFirst();
    if (!existing) {
      return false;
    }

    await prisma.emailConfig.delete({
      where: { id: existing.id },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Save test result to database
 */
export async function saveTestResult(
  status: 'success' | 'error' | 'timeout',
  message: string
): Promise<void> {
  const existing = await prisma.emailConfig.findFirst();
  if (!existing) {
    return;
  }

  await prisma.emailConfig.update({
    where: { id: existing.id },
    data: {
      lastTestedAt: new Date(),
      lastTestStatus: status,
      lastTestMessage: message,
    },
  });
}

/**
 * Increment email usage count
 */
async function incrementEmailUsageCount(): Promise<void> {
  const existing = await prisma.emailConfig.findFirst();
  if (!existing) {
    return;
  }

  await prisma.emailConfig.update({
    where: { id: existing.id },
    data: {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Log an email sending attempt
 */
async function logEmail(data: {
  recipient: string;
  subject: string;
  status: 'sent' | 'failed' | 'queued';
  errorMessage?: string;
  messageId?: string;
  userId?: string;
  module?: string;
  emailType?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.emailLog.create({
    data: {
      recipient: data.recipient,
      subject: data.subject.substring(0, 500), // Truncate to fit DB column
      status: data.status,
      errorMessage: data.errorMessage,
      messageId: data.messageId,
      userId: data.userId,
      module: data.module,
      emailType: data.emailType,
      metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
    },
  });
}

/**
 * Get email logs with pagination
 */
export async function getEmailLogs(options?: {
  limit?: number;
  offset?: number;
  status?: string;
  emailType?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<{ logs: EmailLog[]; total: number }> {
  const where: {
    status?: string;
    emailType?: string;
    sentAt?: { gte?: Date; lte?: Date };
  } = {};

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.emailType) {
    where.emailType = options.emailType;
  }

  if (options?.startDate || options?.endDate) {
    where.sentAt = {};
    if (options.startDate) {
      where.sentAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.sentAt.lte = options.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.emailLog.count({ where }),
  ]);

  return {
    logs: logs.map(transformLog),
    total,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform database config to API type
 */
function transformConfig(dbConfig: {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  encryptedUsername: string;
  encryptedPassword: string;
  fromAddress: string;
  fromName: string | null;
  replyTo: string | null;
  isEnabled: boolean;
  lastTestedAt: Date | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): EmailConfig {
  return {
    id: dbConfig.id,
    host: dbConfig.host,
    port: dbConfig.port,
    secure: dbConfig.secure,
    hasCredentials: !!(dbConfig.encryptedUsername && dbConfig.encryptedPassword),
    maskedUsername: maskCredential(dbConfig.encryptedUsername),
    maskedPassword: maskCredential(dbConfig.encryptedPassword),
    fromAddress: dbConfig.fromAddress,
    fromName: dbConfig.fromName || undefined,
    replyTo: dbConfig.replyTo || undefined,
    isEnabled: dbConfig.isEnabled,
    lastTestedAt: dbConfig.lastTestedAt || undefined,
    lastTestStatus: (dbConfig.lastTestStatus as 'success' | 'error' | 'timeout') || undefined,
    lastTestMessage: dbConfig.lastTestMessage || undefined,
    usageCount: dbConfig.usageCount,
    lastUsedAt: dbConfig.lastUsedAt || undefined,
    createdAt: dbConfig.createdAt,
    updatedAt: dbConfig.updatedAt,
  };
}

/**
 * Transform database log to API type
 */
function transformLog(dbLog: {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  errorMessage: string | null;
  messageId: string | null;
  userId: string | null;
  module: string | null;
  emailType: string | null;
  metadata: unknown;
  sentAt: Date;
  createdAt: Date;
}): EmailLog {
  return {
    id: dbLog.id,
    recipient: dbLog.recipient,
    subject: dbLog.subject,
    status: dbLog.status as 'sent' | 'failed' | 'queued',
    errorMessage: dbLog.errorMessage || undefined,
    messageId: dbLog.messageId || undefined,
    userId: dbLog.userId || undefined,
    module: dbLog.module || undefined,
    emailType: dbLog.emailType || undefined,
    metadata: dbLog.metadata as Record<string, unknown> | undefined,
    sentAt: dbLog.sentAt,
    createdAt: dbLog.createdAt,
  };
}

/**
 * Check if email service is configured and enabled
 */
export async function isEmailServiceAvailable(): Promise<boolean> {
  const config = await getEmailConfig();
  return config !== null && config.isEnabled && config.hasCredentials;
}
