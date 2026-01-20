/**
 * User Invitation API
 *
 * POST - Send or resend invitation email to user
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminPermission, isErrorResponse } from '@/lib/api-permissions';
import { emailService } from '@/lib/email-service';
import { generateInvitationEmail } from '@/lib/email-templates';
import {
  encryptToken,
  generateRandomToken,
  getTokenExpirationDate,
  type TokenData,
} from '@/lib/token-encryption';
import type { ApiResponse } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/access-control/users/[id]/invite
 * Send or resend invitation email to a user
 */
export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id: userId } = await context.params;

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Check email service availability
    const emailAvailable = await emailService.isAvailable();

    if (!emailAvailable) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Email service is not configured. Please configure SMTP settings first.',
        },
        { status: 503 }
      );
    }

    // Invalidate any existing invitation tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        type: 'invitation',
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Mark as used to invalidate
      },
    });

    // Generate encrypted token for URL
    const tokenData: TokenData = {
      email: user.email,
      userId: user.id,
      type: 'invitation',
      createdAt: Date.now(),
    };
    const encryptedToken = encryptToken(tokenData);

    // Generate random token for database storage
    const dbToken = generateRandomToken();
    const expiresAt = getTokenExpirationDate('invitation');

    // Store token in database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: dbToken,
        type: 'invitation',
        expiresAt,
      },
    });

    // Generate invitation URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const setupUrl = `${baseUrl}/auth/setup-password?token=${encryptedToken}`;

    // Generate email content
    const emailContent = generateInvitationEmail({
      userName: user.name,
      userEmail: user.email,
      setupUrl,
      expirationHours: 48,
    });

    // Send invitation email
    const result = await emailService.send({
      to: user.email,
      subject: 'Welcome to Vendor Management System - Set Up Your Account',
      html: emailContent.html,
      text: emailContent.text,
      module: 'user-management',
      emailType: 'invitation',
      userId: authResult.user.id, // Admin who sent the invitation
      metadata: {
        invitedUserId: user.id,
        invitedUserEmail: user.email,
        sentAt: new Date().toISOString(),
      },
    });

    const now = new Date();

    if (!result.success) {
      // Update email delivery status to failed
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastEmailSentAt: now,
          lastEmailDeliveryStatus: 'failed',
          lastEmailError: result.error || 'Email send failed',
        },
      });

      // Create audit log for failed invitation resend
      await prisma.invitationAuditLog.create({
        data: {
          userId: user.id,
          action: 'invitation_failed',
          emailStatus: 'failed',
          errorMessage: result.error || 'Email send failed',
          triggeredBy: authResult.user.id,
          metadata: {
            email: user.email,
            error: result.error,
            isResend: true,
          },
        },
      });

      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `Failed to send invitation email: ${result.error}`,
        },
        { status: 500 }
      );
    }

    // Update user's invitationSentAt timestamp and email delivery status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        invitationSentAt: now,
        lastEmailSentAt: now,
        lastEmailDeliveryStatus: 'sent',
        lastEmailError: null,
        // Ensure status is 'invited' for resent invitations (in case it was reset)
        status: user.status === 'active' ? 'active' : 'invited',
      },
    });

    // Create audit log for successful invitation resend
    await prisma.invitationAuditLog.create({
      data: {
        userId: user.id,
        action: 'invitation_resent',
        emailStatus: 'sent',
        emailMessageId: result.messageId || undefined,
        triggeredBy: authResult.user.id,
        metadata: {
          email: user.email,
          messageId: result.messageId,
          isResend: true,
        },
      },
    });

    return NextResponse.json<ApiResponse<{ message: string; messageId?: string; emailSentAt: Date }>>({
      success: true,
      data: {
        message: `Invitation email sent to ${user.email}`,
        messageId: result.messageId,
        emailSentAt: now,
      },
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to send invitation email',
      },
      { status: 500 }
    );
  }
}
