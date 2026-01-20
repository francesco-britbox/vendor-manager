/**
 * Verify Token API
 *
 * GET - Verify if a token is valid before showing the password setup form
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  decryptToken,
  isTokenExpired,
  getTokenExpirationHours,
} from '@/lib/token-encryption';
import type { ApiResponse } from '@/types';

interface TokenVerificationResult {
  valid: boolean;
  email?: string;
  userName?: string;
  type?: 'invitation' | 'reset';
  error?: string;
}

/**
 * GET /api/auth/verify-token
 * Verify if a token is valid
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json<ApiResponse<TokenVerificationResult>>({
        success: true,
        data: {
          valid: false,
          error: 'Token is missing',
        },
      });
    }

    // Decrypt and validate token
    const tokenData = decryptToken(token);

    if (!tokenData) {
      return NextResponse.json<ApiResponse<TokenVerificationResult>>({
        success: true,
        data: {
          valid: false,
          error: 'Invalid or tampered token',
        },
      });
    }

    // Check token expiration
    const expirationHours = getTokenExpirationHours(tokenData.type);
    if (isTokenExpired(tokenData.createdAt, expirationHours)) {
      return NextResponse.json<ApiResponse<TokenVerificationResult>>({
        success: true,
        data: {
          valid: false,
          error: 'This link has expired',
        },
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json<ApiResponse<TokenVerificationResult>>({
        success: true,
        data: {
          valid: false,
          error: 'User account not found',
        },
      });
    }

    // Validate email matches
    if (user.email.toLowerCase() !== tokenData.email.toLowerCase()) {
      return NextResponse.json<ApiResponse<TokenVerificationResult>>({
        success: true,
        data: {
          valid: false,
          error: 'Invalid token',
        },
      });
    }

    // Check user is active
    if (!user.isActive) {
      return NextResponse.json<ApiResponse<TokenVerificationResult>>({
        success: true,
        data: {
          valid: false,
          error: 'This account has been deactivated',
        },
      });
    }

    // For reset tokens, verify there's a valid database token
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
      });

      if (!validToken) {
        return NextResponse.json<ApiResponse<TokenVerificationResult>>({
          success: true,
          data: {
            valid: false,
            error: 'This reset link has already been used or has expired',
          },
        });
      }
    }

    // Token is valid
    return NextResponse.json<ApiResponse<TokenVerificationResult>>({
      success: true,
      data: {
        valid: true,
        email: user.email,
        userName: user.name,
        type: tokenData.type,
      },
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json<ApiResponse<TokenVerificationResult>>(
      {
        success: false,
        data: {
          valid: false,
          error: 'An error occurred while verifying the token',
        },
      },
      { status: 500 }
    );
  }
}
