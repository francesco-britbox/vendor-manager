/**
 * Vendor Document Download API
 *
 * GET /api/vendors/[id]/documents/[documentId]/download - Download a document
 */

import { NextResponse } from 'next/server';
import {
  requireViewPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  downloadVendorDocument,
  downloadFileFromS3,
  isS3Configured,
} from '@/lib/storage';
import { getDocumentById, validateDocumentId } from '@/lib/vendor-documents';
import { validateVendorId } from '@/lib/vendors';
import { prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/types';

/**
 * GET - Download a document
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const { id, documentId } = await params;

    // Validate IDs
    const vendorIdValidation = validateVendorId(id);
    if (!vendorIdValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: vendorIdValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const docIdValidation = validateDocumentId(documentId);
    if (!docIdValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: docIdValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    // Get document
    const document = await getDocumentById(documentId);

    if (!document) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    // Verify document belongs to vendor
    if (document.vendorId !== id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document does not belong to this vendor',
        },
        { status: 404 }
      );
    }

    // Get the full document record to check storage type
    const fullDocument = await prisma.vendorDocument.findUnique({
      where: { id: documentId },
      select: {
        documentData: true,
        documentMimeType: true,
        documentSize: true,
        documentName: true,
        storageType: true,
        documentKey: true,
      },
    });

    if (!fullDocument) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    let fileData: { body: Uint8Array; contentType: string; size: number };

    // Check storage type and download accordingly
    if (fullDocument.storageType === 'database' && fullDocument.documentData) {
      // Download from database
      fileData = {
        body: new Uint8Array(fullDocument.documentData),
        contentType: fullDocument.documentMimeType,
        size: fullDocument.documentSize,
      };
    } else if (fullDocument.storageType === 's3' && fullDocument.documentKey) {
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
      fileData = await downloadFileFromS3(fullDocument.documentKey);
    } else {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document data not found',
        },
        { status: 404 }
      );
    }

    // Create response with proper headers - use type assertion for Uint8Array
    return new Response(fileData.body as unknown as BodyInit, {
      headers: {
        'Content-Type': fileData.contentType,
        'Content-Length': fileData.size.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(document.documentName)}"`,
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
