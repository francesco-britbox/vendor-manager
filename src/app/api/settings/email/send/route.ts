/**
 * Email Send API
 *
 * POST /api/settings/email/send - Send an email using the configured SMTP settings
 *
 * This endpoint is protected by:
 * - Authentication/authorization (admin required)
 * - Rate limiting per user
 * - Input validation
 */

import { NextResponse } from 'next/server';
import {
  requireAdminPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  sendEmail,
  validateEmail,
  checkRateLimit,
  incrementRateLimit,
  isEmailServiceAvailable,
} from '@/lib/email-config';
import type { ApiResponse } from '@/types';

// Maximum email size (subject + text + html)
const MAX_EMAIL_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * POST - Send an email
 */
export async function POST(request: Request) {
  try {
    // Admin permission required to send emails
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Check if email service is available
    const serviceAvailable = await isEmailServiceAvailable();
    if (!serviceAvailable) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Email service is not configured or disabled',
        },
        { status: 400 }
      );
    }

    // Rate limiting
    const userId = authResult.user.id;
    const rateLimitCheck = await checkRateLimit(`email_send:${userId}`);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json<ApiResponse<{
        remaining: number;
        resetAt: Date;
      }>>(
        {
          success: false,
          error: `Rate limit exceeded. You have sent too many emails. Try again after ${rateLimitCheck.resetAt.toLocaleTimeString()}.`,
          data: {
            remaining: rateLimitCheck.remaining,
            resetAt: rateLimitCheck.resetAt,
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      to,
      subject,
      text,
      html,
      replyTo,
      module,
      emailType,
      metadata,
    } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Recipient (to) is required' },
        { status: 400 }
      );
    }

    // Validate recipient(s)
    const recipients = Array.isArray(to) ? to : [to];
    if (recipients.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    // Limit number of recipients
    if (recipients.length > 50) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Maximum 50 recipients allowed per email' },
        { status: 400 }
      );
    }

    for (const recipient of recipients) {
      const validation = validateEmail(recipient);
      if (!validation.valid) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Invalid recipient: ${recipient}` },
          { status: 400 }
        );
      }
    }

    // Validate subject
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (subject.length > 500) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Subject must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Validate content (must have either text or html)
    if (!text && !html) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Email content (text or html) is required' },
        { status: 400 }
      );
    }

    // Check email size
    const totalSize = (subject?.length || 0) + (text?.length || 0) + (html?.length || 0);
    if (totalSize > MAX_EMAIL_SIZE_BYTES) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Email content exceeds maximum size limit (10 MB)' },
        { status: 400 }
      );
    }

    // Validate reply-to if provided
    if (replyTo) {
      const replyToValidation = validateEmail(replyTo);
      if (!replyToValidation.valid) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Invalid reply-to address: ${replyTo}` },
          { status: 400 }
        );
      }
    }

    // Sanitize module and emailType
    const sanitizedModule = module ? String(module).substring(0, 100) : undefined;
    const sanitizedEmailType = emailType ? String(emailType).substring(0, 50) : undefined;

    // Increment rate limit
    await incrementRateLimit(`email_send:${userId}`);

    // Send the email
    const result = await sendEmail({
      to: recipients,
      subject: subject.trim(),
      text: text?.trim(),
      html: html?.trim(),
      replyTo,
      userId,
      module: sanitizedModule,
      emailType: sanitizedEmailType,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: result.error || 'Failed to send email',
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<{
      messageId?: string;
      recipientCount: number;
    }>>({
      success: true,
      data: {
        messageId: result.messageId,
        recipientCount: recipients.length,
      },
      message: `Email sent successfully to ${recipients.length} recipient(s)`,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      },
      { status: 500 }
    );
  }
}
