/**
 * Email Service
 *
 * This is a reusable email service module that other parts of the application can import/call.
 * It provides a simple, secure interface for sending emails through the configured SMTP server.
 *
 * Usage:
 * ```typescript
 * import { emailService } from '@/lib/email-service';
 *
 * // Check if email service is available
 * if (await emailService.isAvailable()) {
 *   // Send an email
 *   const result = await emailService.send({
 *     to: 'recipient@example.com',
 *     subject: 'Hello',
 *     text: 'Hello World!',
 *   });
 *
 *   if (result.success) {
 *     console.log('Email sent:', result.messageId);
 *   } else {
 *     console.error('Email failed:', result.error);
 *   }
 * }
 * ```
 */

import {
  sendEmail,
  sendTestEmail,
  isEmailServiceAvailable,
  getEmailConfig,
  checkRateLimit,
} from './email-config';
import type { EmailConfig } from '@/types';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  // Metadata for audit logging
  userId?: string;
  module?: string;
  emailType?: string;
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Email Service - A reusable module for sending emails
 */
export const emailService = {
  /**
   * Check if the email service is configured and enabled
   */
  isAvailable: async (): Promise<boolean> => {
    return isEmailServiceAvailable();
  },

  /**
   * Get the current email configuration (without sensitive credentials)
   */
  getConfig: async (): Promise<EmailConfig | null> => {
    return getEmailConfig();
  },

  /**
   * Check rate limit for a specific identifier (user ID or IP)
   */
  checkRateLimit: async (identifier: string): Promise<RateLimitInfo> => {
    return checkRateLimit(identifier);
  },

  /**
   * Send an email
   *
   * @param options - Email options
   * @returns Result with success status and message ID or error
   *
   * @example
   * ```typescript
   * const result = await emailService.send({
   *   to: 'user@example.com',
   *   subject: 'Welcome',
   *   html: '<h1>Welcome!</h1>',
   *   module: 'user-registration',
   *   emailType: 'welcome',
   * });
   * ```
   */
  send: async (options: SendEmailOptions): Promise<SendEmailResult> => {
    return sendEmail(options);
  },

  /**
   * Send a test email to verify configuration
   *
   * @param recipientEmail - Email address to send test to
   * @returns Result with success status
   */
  sendTest: async (recipientEmail: string): Promise<SendEmailResult> => {
    return sendTestEmail(recipientEmail);
  },

  /**
   * Send a plain text email (convenience method)
   */
  sendText: async (
    to: string | string[],
    subject: string,
    text: string,
    options?: Partial<SendEmailOptions>
  ): Promise<SendEmailResult> => {
    return sendEmail({
      to,
      subject,
      text,
      ...options,
    });
  },

  /**
   * Send an HTML email (convenience method)
   */
  sendHtml: async (
    to: string | string[],
    subject: string,
    html: string,
    options?: Partial<SendEmailOptions>
  ): Promise<SendEmailResult> => {
    return sendEmail({
      to,
      subject,
      html,
      ...options,
    });
  },

  /**
   * Send a notification email
   * Pre-configured for notification-style emails with standard metadata
   */
  sendNotification: async (
    to: string | string[],
    subject: string,
    content: { text?: string; html?: string },
    options?: {
      userId?: string;
      notificationType?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<SendEmailResult> => {
    return sendEmail({
      to,
      subject,
      text: content.text,
      html: content.html,
      module: 'notifications',
      emailType: options?.notificationType || 'notification',
      userId: options?.userId,
      metadata: options?.metadata,
    });
  },

  /**
   * Send an alert email (high priority)
   * Pre-configured for alert-style emails with standard metadata
   */
  sendAlert: async (
    to: string | string[],
    subject: string,
    content: { text?: string; html?: string },
    options?: {
      userId?: string;
      alertType?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<SendEmailResult> => {
    return sendEmail({
      to,
      subject: `[ALERT] ${subject}`,
      text: content.text,
      html: content.html,
      module: 'alerts',
      emailType: options?.alertType || 'alert',
      userId: options?.userId,
      metadata: options?.metadata,
    });
  },
};

// Default export for convenience
export default emailService;
