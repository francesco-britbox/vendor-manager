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
  downloadFileFromS3,
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

    // Get contract with document info including binary data
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: {
        id: true,
        documentKey: true,
        documentData: true,
        documentName: true,
        documentType: true,
        documentSize: true,
        storageType: true,
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

    if (!contract.documentKey && !contract.documentData) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'No document available for this contract',
        },
        { status: 404 }
      );
    }

    let fileData: { body: Uint8Array; contentType: string; size: number };

    // Check if redirect to presigned URL is requested (only works for S3 storage)
    const { searchParams } = new URL(request.url);
    const redirect = searchParams.get('redirect') === 'true';

    // Check storage type and download accordingly
    if (contract.storageType === 'database' && contract.documentData) {
      // Download from database
      if (redirect) {
        // Can't redirect for database storage, just serve the file
        console.warn('Redirect requested but document is stored in database, serving directly');
      }

      fileData = {
        body: new Uint8Array(contract.documentData),
        contentType: contract.documentType || 'application/octet-stream',
        size: contract.documentSize || contract.documentData.length,
      };
    } else if (contract.storageType === 's3' && contract.documentKey) {
      // Fallback to S3 for documents that haven't been migrated yet
      if (!isS3Configured()) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'Document is stored in S3 but S3 is not configured. Please run migration.',
          },
          { status: 503 }
        );
      }

      if (redirect) {
        // Generate presigned URL and redirect
        const presignedUrl = await getPresignedDownloadUrl(
          contract.documentKey,
          3600 // 1 hour
        );
        return NextResponse.redirect(presignedUrl);
      }

      fileData = await downloadFileFromS3(contract.documentKey);
    } else if (contract.documentKey) {
      // Legacy case: no storageType set but has documentKey (assume S3)
      if (!isS3Configured()) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'Document storage is not configured. Please run migration.',
          },
          { status: 503 }
        );
      }

      if (redirect) {
        // Generate presigned URL and redirect
        const presignedUrl = await getPresignedDownloadUrl(
          contract.documentKey,
          3600 // 1 hour
        );
        return NextResponse.redirect(presignedUrl);
      }

      fileData = await downloadFileFromS3(contract.documentKey);
    } else {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document data not found',
        },
        { status: 404 }
      );
    }

    const fileName = contract.documentName || 'document';

    // Create response with proper headers - use type assertion for Uint8Array
    return new Response(fileData.body as unknown as BodyInit, {
      headers: {
        'Content-Type': fileData.contentType,
        'Content-Length': fileData.size.toString(),
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
