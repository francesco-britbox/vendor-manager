/**
 * Vendor Documents API
 *
 * GET /api/vendors/[id]/documents - Get all documents for a vendor
 * POST /api/vendors/[id]/documents - Upload a new document for a vendor
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  isStorageConfigured,
  getMaxFileSize,
  validateFile,
  generateDocumentKey,
  EXTENDED_ALLOWED_FILE_TYPES,
} from '@/lib/storage';
import {
  getVendorDocuments,
  createVendorDocument,
  getDocumentStats,
} from '@/lib/vendor-documents';
import { validateVendorId } from '@/lib/vendors';
import type { ApiResponse, VendorDocument, DocumentType } from '@/types';
import { DOCUMENT_TYPE_LABELS } from '@/types';

/**
 * GET - Get all documents for a vendor
 */
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

    // Validate vendor ID
    const idValidation = validateVendorId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!vendor) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Vendor not found',
        },
        { status: 404 }
      );
    }

    // Check URL params for stats
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';

    // Get documents
    const documents = await getVendorDocuments(id);

    // Optionally include stats
    let stats = null;
    if (includeStats) {
      stats = await getDocumentStats(id);
    }

    return NextResponse.json<
      ApiResponse<{
        documents: VendorDocument[];
        stats?: typeof stats;
        documentTypes: typeof DOCUMENT_TYPE_LABELS;
      }>
    >({
      success: true,
      data: {
        documents,
        ...(stats && { stats }),
        documentTypes: DOCUMENT_TYPE_LABELS,
      },
    });
  } catch (error) {
    console.error('Error getting vendor documents:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get vendor documents',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Upload a new document for a vendor
 */
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

    // Validate vendor ID
    const idValidation = validateVendorId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!vendor) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Vendor not found',
        },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentType = (formData.get('documentType') as DocumentType) || 'OTHER';
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const enableAiExtraction = formData.get('enableAiExtraction') !== 'false';
    const documentDate = formData.get('documentDate') as string | null;
    const expiryDate = formData.get('expiryDate') as string | null;

    if (!file) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    // Validate file - use extended types for vendor documents
    const validation = validateFile(
      { size: file.size, type: file.type, name: file.name },
      { allowImages: true }
    );
    if (!validation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.error,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate document key for identification
    const documentKey = generateDocumentKey(file.name, `vendors/${id}/documents`);

    // Create document record with binary data stored in database
    const document = await createVendorDocument({
      vendorId: id,
      documentType,
      title: title || undefined,
      description: description || undefined,
      documentKey,
      documentName: file.name,
      documentSize: buffer.length,
      documentMimeType: file.type,
      enableAiExtraction,
      documentDate: documentDate ? new Date(documentDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      // Store binary data directly in the database
      documentData: buffer,
      storageType: 'database',
    });

    return NextResponse.json<ApiResponse<VendorDocument>>(
      {
        success: true,
        data: document,
        message: 'Document uploaded successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading vendor document:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload document',
      },
      { status: 500 }
    );
  }
}
