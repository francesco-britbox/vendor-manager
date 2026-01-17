/**
 * Contract Document Upload API
 *
 * POST /api/contracts/[id]/upload - Upload a document for a contract
 * DELETE /api/contracts/[id]/upload - Delete the document for a contract
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  validateFile,
  isStorageConfigured,
  getMaxFileSize,
  generateDocumentKey,
  deleteFileFromS3,
  isS3Configured,
  ALLOWED_FILE_TYPES,
} from '@/lib/storage';
import type { ApiResponse, DocumentUploadResponse } from '@/types';
import { validateContractId } from '@/lib/contracts';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check write permission
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Check if storage is configured (always true for database storage)
    if (!isStorageConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document storage is not configured.',
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

    // Check if contract exists
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: { id: true, documentKey: true, storageType: true },
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile({
      size: file.size,
      type: file.type,
      name: file.name,
    });

    if (!validation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.error,
        },
        { status: 400 }
      );
    }

    // Delete existing document from S3 if present and stored there (legacy)
    if (contract.documentKey && contract.storageType === 's3' && isS3Configured()) {
      try {
        await deleteFileFromS3(contract.documentKey);
      } catch (error) {
        console.warn('Failed to delete existing document from S3:', error);
        // Continue with upload even if delete fails
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate document key for identification
    const documentKey = generateDocumentKey(file.name, `contracts/${id}`);

    // Update contract with document info stored in database
    const now = new Date();
    await prisma.contract.update({
      where: { id },
      data: {
        documentKey,
        documentData: buffer, // Store binary data directly in database
        documentName: file.name,
        documentSize: buffer.length,
        documentType: file.type,
        documentUploadedAt: now,
        storageType: 'database',
        documentUrl: null, // Clear external URL when uploading new document
      },
    });

    const response: DocumentUploadResponse = {
      documentKey,
      documentName: file.name,
      documentSize: buffer.length,
      documentType: file.type,
      documentUploadedAt: now,
      downloadUrl: `/api/contracts/${id}/download`,
    };

    return NextResponse.json<ApiResponse<DocumentUploadResponse>>({
      success: true,
      data: response,
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check write permission
    const authResult = await requireWritePermission();
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

    // Get contract with document info
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: { id: true, documentKey: true, storageType: true },
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
          error: 'No document to delete',
        },
        { status: 404 }
      );
    }

    // Delete from S3 if stored there (legacy)
    if (contract.storageType === 's3' && isS3Configured()) {
      try {
        await deleteFileFromS3(contract.documentKey);
      } catch (error) {
        console.warn('Failed to delete document from S3:', error);
        // Continue to clear database even if S3 delete fails
      }
    }

    // Clear document info in database (this also deletes binary data for database storage)
    await prisma.contract.update({
      where: { id },
      data: {
        documentKey: null,
        documentData: null,
        documentName: null,
        documentSize: null,
        documentType: null,
        documentUploadedAt: null,
        storageType: null,
      },
    });

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete document',
      },
      { status: 500 }
    );
  }
}

// Return upload configuration for client
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check view permission - no auth needed for getting upload config
    // but we want to know if the user is logged in
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    return NextResponse.json<ApiResponse<{
      maxFileSize: number;
      maxFileSizeMB: number;
      allowedTypes: readonly string[];
      isConfigured: boolean;
    }>>({
      success: true,
      data: {
        maxFileSize: getMaxFileSize(),
        maxFileSizeMB: getMaxFileSize() / (1024 * 1024),
        allowedTypes: ALLOWED_FILE_TYPES,
        isConfigured: isStorageConfigured(), // Always true for database storage
      },
    });
  } catch (error) {
    console.error('Error getting upload config:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get upload configuration',
      },
      { status: 500 }
    );
  }
}
