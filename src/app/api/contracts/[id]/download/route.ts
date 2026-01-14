/**
 * Contract Document Download API
 *
 * GET /api/contracts/[id]/download - Download the document for a contract
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireViewPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  downloadFile,
  getPresignedDownloadUrl,
  isS3Configured,
} from '@/lib/storage';
import type { ApiResponse } from '@/types';
import { validateContractId } from '@/lib/contracts';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Check if S3 is configured
    if (!isS3Configured()) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document storage is not configured',
        },
        { status: 503 }
      );
    }

    const { id } = await params;

    // Validate contract ID
    const idValidation = validateContractId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    // Get contract with document info
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: {
        id: true,
        documentKey: true,
        documentName: true,
        documentType: true,
      },
    });

    if (!contract) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Contract not found',
        },
        { status: 404 }
      );
    }

    if (!contract.documentKey) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'No document available for this contract',
        },
        { status: 404 }
      );
    }

    // Check if redirect to presigned URL is requested
    const { searchParams } = new URL(request.url);
    const redirect = searchParams.get('redirect') === 'true';

    if (redirect) {
      // Generate presigned URL and redirect
      const presignedUrl = await getPresignedDownloadUrl(
        contract.documentKey,
        3600 // 1 hour
      );
      return NextResponse.redirect(presignedUrl);
    }

    // Download and stream the file
    const { body, contentType, size } = await downloadFile(contract.documentKey);

    const fileName = contract.documentName || 'document';

    // Create response with proper headers - use type assertion for Uint8Array
    return new Response(body as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': size.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download document',
      },
      { status: 500 }
    );
  }
}
