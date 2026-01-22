/**
 * User Password Change API
 *
 * PUT - Change current user's password
 * Requires current password verification before allowing change
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-permissions';
import { hashPassword, verifyPassword } from '@/lib/password';
import type { ApiResponse } from '@/types';

// Password validation rules (matching setup-password/route.ts)
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULES = {
  minLength: PASSWORD_MIN_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

// Special characters allowed in password
const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

/**
 * Password strength level
 */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

/**
 * Validate password against security requirements
 * Returns detailed validation result for real-time feedback
 */
function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
  strength: PasswordStrength;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
} {
  const errors: string[] = [];
  const requirements = {
    minLength: password.length >= PASSWORD_RULES.minLength,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: SPECIAL_CHARS_REGEX.test(password),
  };

  if (!requirements.minLength) {
    errors.push(`Password must be at least ${PASSWORD_RULES.minLength} characters long`);
  }

  if (PASSWORD_RULES.requireUppercase && !requirements.hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_RULES.requireLowercase && !requirements.hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_RULES.requireNumbers && !requirements.hasNumber) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_RULES.requireSpecialChars && !requirements.hasSpecialChar) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':\"\\|,.<>/?)');
  }

  // Calculate strength based on requirements met
  const requirementsMet = Object.values(requirements).filter(Boolean).length;
  let strength: PasswordStrength;

  if (requirementsMet <= 2) {
    strength = 'weak';
  } else if (requirementsMet === 3) {
    strength = 'fair';
  } else if (requirementsMet === 4) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  // Bonus strength for longer passwords
  if (password.length >= 12 && requirementsMet >= 4) {
    strength = 'strong';
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
    requirements,
  };
}

interface PasswordChangeResponse {
  message: string;
}

/**
 * PUT /api/user/password
 * Change current user's password
 */
export async function PUT(request: Request) {
  try {
    const authResult = await getAuthenticatedUser();

    if (!authResult) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate required fields
    if (!currentPassword) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Current password is required' },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'New password is required' },
        { status: 400 }
      );
    }

    if (!confirmPassword) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Password confirmation is required' },
        { status: 400 }
      );
    }

    // Check passwords match (case-sensitive)
    if (newPassword !== confirmPassword) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'New passwords do not match' },
        { status: 400 }
      );
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: passwordValidation.errors.join('. ') },
        { status: 400 }
      );
    }

    // Get current user with password hash
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Check new password is different from current
    const isSamePassword = await verifyPassword(newPassword, user.password);
    if (isSamePassword) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user's password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordSetAt: new Date(),
      },
    });

    return NextResponse.json<ApiResponse<PasswordChangeResponse>>({
      success: true,
      data: { message: 'Password changed successfully' },
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to change password. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/password/validate
 * Validate password strength without changing (for real-time feedback)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    const validation = validatePassword(password);

    return NextResponse.json({
      success: true,
      data: {
        valid: validation.valid,
        strength: validation.strength,
        requirements: validation.requirements,
        errors: validation.errors,
      },
    });
  } catch (error) {
    console.error('Error validating password:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to validate password' },
      { status: 500 }
    );
  }
}
