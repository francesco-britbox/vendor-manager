/**
 * Individual Vendor Document API
 *
 * GET /api/vendors/[id]/documents/[documentId] - Get a specific document
 * PUT /api/vendors/[id]/documents/[documentId] - Update a document
 * DELETE /api/vendors/[id]/documents/[documentId] - Delete a document
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  deleteFileFromS3,
  isS3Configured,
} from '@/lib/storage';
import {
  getDocumentById,
  updateVendorDocument,
  deleteVendorDocument,
  validateDocumentId,
  validateUpdateVendorDocumentInput,
} from '@/lib/vendor-documents';
import { validateVendorId } from '@/lib/vendors';
import type { ApiResponse, VendorDocument } from '@/types';

/**
 * GET - Get a specific document
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

    return NextResponse.json<ApiResponse<VendorDocument>>({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Error getting vendor document:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get document',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update a document
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    // Check write permission
    const authResult = await requireWritePermission();
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

    // Get existing document
    const existing = await getDocumentById(documentId);

    if (!existing) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    // Verify document belongs to vendor
    if (existing.vendorId !== id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document does not belong to this vendor',
        },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = validateUpdateVendorDocumentInput(body);

    if (!validation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    // Update document
    const document = await updateVendorDocument(documentId, validation.data!);

    return NextResponse.json<ApiResponse<VendorDocument>>({
      success: true,
      data: document!,
      message: 'Document updated successfully',
    });
  } catch (error) {
    console.error('Error updating vendor document:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update document',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a document
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    // Check write permission
    const authResult = await requireWritePermission();
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

    // Get existing document
    const existing = await getDocumentById(documentId);

    if (!existing) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    // Verify document belongs to vendor
    if (existing.vendorId !== id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document does not belong to this vendor',
        },
        { status: 404 }
      );
    }

    // Get full document to check storage type
    const fullDocument = await prisma.vendorDocument.findUnique({
      where: { id: documentId },
      select: { storageType: true, documentKey: true },
    });

    // If document was stored in S3 (legacy), delete from S3
    if (fullDocument?.storageType === 's3' && fullDocument.documentKey && isS3Configured()) {
      try {
        await deleteFileFromS3(fullDocument.documentKey);
      } catch (error) {
        console.warn('Failed to delete file from S3:', error);
        // Continue with database deletion even if S3 delete fails
      }
    }
    // For database storage, the binary data will be deleted with the record

    // Delete document record (this also deletes the binary data for database storage)
    const deleted = await deleteVendorDocument(documentId);

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Failed to delete document',
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting vendor document:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete document',
      },
      { status: 500 }
    );
  }
}
