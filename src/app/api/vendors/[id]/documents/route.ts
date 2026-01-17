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
  uploadFile,
  validateFile,
  isS3Configured,
  getMaxFileSize,
} from '@/lib/storage';
import {
  getVendorDocuments,
  createVendorDocument,
  getDocumentStats,
} from '@/lib/vendor-documents';
import { validateVendorId } from '@/lib/vendors';
import type { ApiResponse, VendorDocument, DocumentType } from '@/types';
import { DOCUMENT_TYPE_LABELS } from '@/types';

// Extended file types for vendor documents
const EXTENDED_ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

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

    // Check if S3 is configured
    if (!isS3Configured()) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document storage is not configured. Please set up S3 credentials.',
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

    // Validate file - use extended types
    const maxSize = getMaxFileSize();
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `File size exceeds the maximum allowed size of ${maxSizeMB}MB`,
        },
        { status: 400 }
      );
    }

    if (!EXTENDED_ALLOWED_FILE_TYPES.includes(file.type as typeof EXTENDED_ALLOWED_FILE_TYPES[number])) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `File type "${file.type}" is not allowed. Allowed types: PDF, Word documents, Images (JPG, PNG, GIF, WebP)`,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const uploadResult = await uploadFile(buffer, file.name, {
      folder: `vendors/${id}/documents`,
      contentType: file.type,
      metadata: {
        vendorId: id,
        vendorName: vendor.name,
        documentType,
        originalName: file.name,
        uploadedBy: authResult.user.id || 'unknown',
      },
    });

    // Create document record
    const document = await createVendorDocument({
      vendorId: id,
      documentType,
      title: title || undefined,
      description: description || undefined,
      documentKey: uploadResult.key,
      documentName: file.name,
      documentSize: uploadResult.size,
      documentMimeType: uploadResult.contentType,
      enableAiExtraction,
      documentDate: documentDate ? new Date(documentDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
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
