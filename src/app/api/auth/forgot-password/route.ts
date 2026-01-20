/**
 * Forgot Password API
 *
 * POST - Request password reset email
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email-service';
import { generatePasswordResetEmail } from '@/lib/email-templates';
import {
  encryptToken,
  generateRandomToken,
  getTokenExpirationDate,
  type TokenData,
} from '@/lib/token-encryption';
import { checkRateLimit, incrementRateLimit } from '@/lib/email-config';
import type { ApiResponse } from '@/types';

/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Email address is required',
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check rate limit (use email as identifier to prevent abuse)
    const rateLimitKey = `password-reset:${normalizedEmail}`;
    const rateLimit = await checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Too many password reset requests. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration
    // But only send email if user exists and is active
    if (user && user.isActive) {
      // Check email service availability
      const emailAvailable = await emailService.isAvailable();

      if (!emailAvailable) {
        console.error('Email service not available for password reset');
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'Email service is not configured. Please contact your administrator.',
          },
          { status: 503 }
        );
      }

      // Invalidate any existing reset tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          type: 'reset',
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
        type: 'reset',
        createdAt: Date.now(),
      };
      const encryptedToken = encryptToken(tokenData);

      // Generate random token for database storage
      const dbToken = generateRandomToken();
      const expiresAt = getTokenExpirationDate('reset');

      // Store token in database
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: dbToken,
          type: 'reset',
          expiresAt,
        },
      });

      // Generate reset URL
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const resetUrl = `${baseUrl}/auth/setup-password?token=${encryptedToken}`;

      // Generate email content
      const emailContent = generatePasswordResetEmail({
        userName: user.name,
        userEmail: user.email,
        resetUrl,
        expirationHours: 2,
      });

      // Send password reset email
      const result = await emailService.send({
        to: user.email,
        subject: 'Reset Your Password - Vendor Management System',
        html: emailContent.html,
        text: emailContent.text,
        module: 'authentication',
        emailType: 'password-reset',
        userId: user.id,
        metadata: {
          tokenId: dbToken.substring(0, 8), // Partial token for audit
          requestedAt: new Date().toISOString(),
        },
      });

      if (!result.success) {
        console.error('Failed to send password reset email:', result.error);
        // Don't expose email sending errors to prevent information leakage
      }

      // Increment rate limit on successful request
      await incrementRateLimit(rateLimitKey);
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: {
        message: 'If an account with that email exists, a password reset link has been sent.',
      },
    });
  } catch (error) {
    console.error('Error processing password reset request:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'An error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}
