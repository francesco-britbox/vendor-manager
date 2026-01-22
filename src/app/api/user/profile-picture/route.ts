/**
 * User Profile Picture API
 *
 * GET - Get current user's profile picture
 * POST - Upload new profile picture
 * DELETE - Remove profile picture
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, unauthorizedResponse } from '@/lib/api-permissions';
import type { ApiResponse } from '@/types';

// Allowed image MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

// Maximum file size: 1MB
const MAX_FILE_SIZE = 1 * 1024 * 1024;

// Target image dimensions for resizing
const TARGET_SIZE = 300;

/**
 * Validate image file
 */
function validateImageFile(
  file: File
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds maximum allowed size of 1MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Only PNG and JPEG images are allowed.`,
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  );
  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Invalid file extension. Only .jpg, .jpeg, and .png files are allowed.`,
    };
  }

  return { valid: true };
}

/**
 * Validate that the file content is actually an image
 * by checking magic bytes
 */
function validateImageMagicBytes(buffer: Buffer): { valid: boolean; detectedType?: string } {
  // JPEG magic bytes: FF D8 FF
  const isJpeg =
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (isJpeg) {
    return { valid: true, detectedType: 'image/jpeg' };
  }
  if (isPng) {
    return { valid: true, detectedType: 'image/png' };
  }

  return { valid: false };
}

/**
 * Simple image resizing using canvas-like approach
 * Note: For production, consider using sharp or similar library
 * This is a basic implementation that stores the original image
 * and relies on CSS for display sizing
 */
async function processImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ data: Buffer; mimeType: string }> {
  // For now, we store the original image and rely on CSS for sizing
  // In a production environment, you would use a library like 'sharp'
  // to resize the image server-side

  // If the image is larger than 1MB after validation, we could compress it here
  // For this implementation, we trust the client-side validation for size

  return {
    data: buffer,
    mimeType: mimeType,
  };
}

interface ProfilePictureResponse {
  hasProfilePicture: boolean;
  profilePictureUpdatedAt?: string;
  profilePictureName?: string;
}

/**
 * GET /api/user/profile-picture
 * Get current user's profile picture
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
        profilePictureData: true,
        profilePictureMimeType: true,
        profilePictureName: true,
        profilePictureUploadedAt: true,
      },
    });

    if (!user || !user.profilePictureData) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'No profile picture found' },
        { status: 404 }
      );
    }

    // Return the image data directly
    // Convert Buffer to Uint8Array for NextResponse compatibility
    const imageData = new Uint8Array(user.profilePictureData);

    return new NextResponse(imageData, {
      status: 200,
      headers: {
        'Content-Type': user.profilePictureMimeType || 'image/jpeg',
        'Content-Length': imageData.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching profile picture:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch profile picture' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/profile-picture
 * Upload new profile picture
 */
export async function POST(request: Request) {
  try {
    const authResult = await getAuthenticatedUser();

    if (!authResult) {
      return unauthorizedResponse();
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes to ensure it's actually an image
    const magicBytesValidation = validateImageMagicBytes(buffer);
    if (!magicBytesValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'File content does not match a valid image format. Please upload a genuine PNG or JPEG image.',
        },
        { status: 400 }
      );
    }

    // Process image (resize/optimize)
    const processedImage = await processImage(buffer, magicBytesValidation.detectedType || file.type);

    // Update user with new profile picture
    const updatedUser = await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        profilePictureData: processedImage.data,
        profilePictureName: file.name,
        profilePictureSize: processedImage.data.length,
        profilePictureMimeType: processedImage.mimeType,
        profilePictureUploadedAt: new Date(),
      },
      select: {
        profilePictureName: true,
        profilePictureUploadedAt: true,
      },
    });

    return NextResponse.json<ApiResponse<ProfilePictureResponse>>({
      success: true,
      data: {
        hasProfilePicture: true,
        profilePictureUpdatedAt: updatedUser.profilePictureUploadedAt?.toISOString(),
        profilePictureName: updatedUser.profilePictureName || undefined,
      },
      message: 'Profile picture uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to upload profile picture. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/profile-picture
 * Remove current profile picture
 */
export async function DELETE() {
  try {
    const authResult = await getAuthenticatedUser();

    if (!authResult) {
      return unauthorizedResponse();
    }

    // Check if user has a profile picture
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: { profilePictureName: true },
    });

    if (!user?.profilePictureName) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'No profile picture to delete' },
        { status: 404 }
      );
    }

    // Remove profile picture data
    await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        profilePictureData: null,
        profilePictureName: null,
        profilePictureSize: null,
        profilePictureMimeType: null,
        profilePictureUploadedAt: null,
      },
    });

    return NextResponse.json<ApiResponse<ProfilePictureResponse>>({
      success: true,
      data: {
        hasProfilePicture: false,
      },
      message: 'Profile picture removed successfully',
    });
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to delete profile picture. Please try again.' },
      { status: 500 }
    );
  }
}
