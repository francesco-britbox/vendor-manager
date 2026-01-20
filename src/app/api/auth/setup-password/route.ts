/**
 * Setup Password API
 *
 * POST - Set or reset password using encrypted token
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import {
  decryptToken,
  isTokenExpired,
  getTokenExpirationHours,
} from '@/lib/token-encryption';
import type { ApiResponse } from '@/types';

// Password validation rules
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULES = {
  minLength: PASSWORD_MIN_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/**
 * Validate password against security requirements
 */
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || password.length < PASSWORD_RULES.minLength) {
    errors.push(`Password must be at least ${PASSWORD_RULES.minLength} characters long`);
  }

  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_RULES.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_RULES.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * POST /api/auth/setup-password
 * Set password using encrypted token from email
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword } = body;

    // Validate required fields
    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid or missing token',
        },
        { status: 400 }
      );
    }

    if (!password || !confirmPassword) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Password and confirmation are required',
        },
        { status: 400 }
      );
    }

    // Check passwords match
    if (password !== confirmPassword) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Passwords do not match',
        },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: passwordValidation.errors.join('. '),
        },
        { status: 400 }
      );
    }

    // Decrypt and validate token
    const tokenData = decryptToken(token);

    if (!tokenData) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid or tampered token. Please request a new link.',
        },
        { status: 400 }
      );
    }

    // Check token expiration
    const expirationHours = getTokenExpirationHours(tokenData.type);
    if (isTokenExpired(tokenData.createdAt, expirationHours)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'This link has expired. Please request a new one.',
        },
        { status: 400 }
      );
    }

    // Find user and validate email matches
    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId },
    });

    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'User account not found. Please contact your administrator.',
        },
        { status: 404 }
      );
    }

    // Validate email matches (extra security check)
    if (user.email.toLowerCase() !== tokenData.email.toLowerCase()) {
      console.error('Token email mismatch detected - potential tampering attempt');
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid token. Please request a new link.',
        },
        { status: 400 }
      );
    }

    // Check user is active
    if (!user.isActive) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'This account has been deactivated. Please contact your administrator.',
        },
        { status: 403 }
      );
    }

    // Check if there's a valid token in database (for reset type)
    // For invitations, we don't require a database token
    if (tokenData.type === 'reset') {
      const validToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          type: 'reset',
          usedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!validToken) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'This reset link has already been used or has expired. Please request a new one.',
          },
          { status: 400 }
        );
      }

      // Mark token as used
      await prisma.passwordResetToken.update({
        where: { id: validToken.id },
        data: { usedAt: new Date() },
      });
    }

    // For invitation type, check/mark invitation token
    if (tokenData.type === 'invitation') {
      const validToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          type: 'invitation',
          usedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (validToken) {
        // Mark token as used
        await prisma.passwordResetToken.update({
          where: { id: validToken.id },
          data: { usedAt: new Date() },
        });
      }
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Use a transaction to ensure atomicity of status updates
    const now = new Date();
    const previousStatus = user.status;

    await prisma.$transaction(async (tx) => {
      // Update user's password, status, and set timestamps
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordSetAt: now,
          // Transition status from 'invited' to 'active' only for invitation flow
          status: tokenData.type === 'invitation' ? 'active' : user.status,
          // Set invitation accepted timestamp for invitation flow
          invitationAcceptedAt: tokenData.type === 'invitation' ? now : user.invitationAcceptedAt,
        },
      });

      // Invalidate all other tokens for this user
      await tx.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      });

      // Create audit log entry for invitation acceptance (status transition)
      if (tokenData.type === 'invitation') {
        await tx.invitationAuditLog.create({
          data: {
            userId: user.id,
            action: 'invitation_accepted',
            previousStatus: previousStatus,
            newStatus: 'active',
            metadata: {
              email: user.email,
              acceptedAt: now.toISOString(),
            },
          },
        });
      }
    });

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: {
        message: 'Password has been set successfully. You can now sign in.',
      },
    });
  } catch (error) {
    console.error('Error setting password:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'An error occurred while setting your password. Please try again.',
      },
      { status: 500 }
    );
  }
}
