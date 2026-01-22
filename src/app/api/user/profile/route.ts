/**
 * User Profile API
 *
 * GET - Get current user's profile
 * PUT - Update current user's profile (name only - email is read-only)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, isErrorResponse, unauthorizedResponse } from '@/lib/api-permissions';
import type { ApiResponse } from '@/types';

// Name validation constants
const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 255;

// Characters that should be stripped/sanitized from names
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
  /<[^>]+>/g, // HTML tags
  /javascript:/gi, // JavaScript protocol
  /on\w+=/gi, // Event handlers
];

/**
 * Sanitize name input to prevent XSS and injection attacks
 */
function sanitizeName(name: string): string {
  let sanitized = name.trim();

  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}

/**
 * Validate name input
 */
function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < NAME_MIN_LENGTH) {
    return { valid: false, error: `Name must be at least ${NAME_MIN_LENGTH} character` };
  }

  if (trimmedName.length > NAME_MAX_LENGTH) {
    return { valid: false, error: `Name must be at most ${NAME_MAX_LENGTH} characters` };
  }

  return { valid: true };
}

interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  permissionLevel: string;
  hasProfilePicture: boolean;
  profilePictureUpdatedAt?: string;
}

/**
 * GET /api/user/profile
 * Get current user's profile
 */
export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();

    if (!authResult) {
      return unauthorizedResponse();
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        permissionLevel: true,
        profilePictureUploadedAt: true,
        profilePictureName: true,
      },
    });

    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const response: UserProfileResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      permissionLevel: user.permissionLevel,
      hasProfilePicture: !!user.profilePictureName,
      profilePictureUpdatedAt: user.profilePictureUploadedAt?.toISOString(),
    };

    return NextResponse.json<ApiResponse<UserProfileResponse>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/profile
 * Update current user's profile (name only)
 */
export async function PUT(request: Request) {
  try {
    const authResult = await getAuthenticatedUser();

    if (!authResult) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { name } = body;

    // Validate name
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: nameValidation.error },
        { status: 400 }
      );
    }

    // Sanitize name
    const sanitizedName = sanitizeName(name);

    // Re-validate after sanitization
    if (sanitizedName.length < NAME_MIN_LENGTH) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Name contains invalid characters' },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.id },
      data: { name: sanitizedName },
      select: {
        id: true,
        name: true,
        email: true,
        permissionLevel: true,
        profilePictureUploadedAt: true,
        profilePictureName: true,
      },
    });

    const response: UserProfileResponse = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      permissionLevel: updatedUser.permissionLevel,
      hasProfilePicture: !!updatedUser.profilePictureName,
      profilePictureUpdatedAt: updatedUser.profilePictureUploadedAt?.toISOString(),
    };

    return NextResponse.json<ApiResponse<UserProfileResponse>>({
      success: true,
      data: response,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
