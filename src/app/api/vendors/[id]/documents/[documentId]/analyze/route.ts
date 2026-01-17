/**
 * Vendor Document Analysis API
 *
 * POST /api/vendors/[id]/documents/[documentId]/analyze - Trigger AI analysis
 * GET /api/vendors/[id]/documents/[documentId]/analyze - Get existing analysis
 * DELETE /api/vendors/[id]/documents/[documentId]/analyze - Delete analysis
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  analyzeVendorDocument,
  getDocumentAnalysis,
  deleteDocumentAnalysis,
} from '@/lib/vendor-document-analyzer';
import { getDocumentById, validateDocumentId } from '@/lib/vendor-documents';
import { validateVendorId } from '@/lib/vendors';
import type { ApiResponse, VendorDocumentAnalysis, AIProvider } from '@/types';

/**
 * POST - Trigger AI analysis
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    // Require write permission to trigger analysis
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

    // Verify document exists and belongs to vendor
    const document = await getDocumentById(documentId);
    if (!document || document.vendorId !== id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    // Parse request body for options
    let force = false;
    let provider: AIProvider | undefined;
    let model: string | undefined;

    try {
      const body = await request.json();
      force = body?.force === true;
      provider = body?.provider;
      model = body?.model;
    } catch {
      // No body or invalid JSON is fine
    }

    // Run analysis
    const result = await analyzeVendorDocument(documentId, {
      force,
      provider,
      model,
    });

    if (!result.success || !result.analysis) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: result.error || 'Analysis failed',
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<{
      analysis: VendorDocumentAnalysis;
      details?: typeof result.details;
    }>>({
      success: true,
      data: {
        analysis: result.analysis,
        details: result.details,
      },
      message: result.details?.provider === 'cached'
        ? 'Analysis retrieved from cache'
        : 'Document analyzed successfully',
    });
  } catch (error) {
    console.error('Error analyzing document:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze document',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get existing analysis
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    // Require view permission
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

    // Verify document exists and belongs to vendor
    const document = await getDocumentById(documentId);
    if (!document || document.vendorId !== id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    // Get existing analysis
    const analysis = await getDocumentAnalysis(documentId);

    if (!analysis) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'No analysis found for this document',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<VendorDocumentAnalysis>>({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Error getting document analysis:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get analysis',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete analysis
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    // Require write permission
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

    // Verify document exists and belongs to vendor
    const document = await getDocumentById(documentId);
    if (!document || document.vendorId !== id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    // Delete analysis
    const deleted = await deleteDocumentAnalysis(documentId);

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'No analysis found to delete',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
      message: 'Analysis deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting document analysis:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete analysis',
      },
      { status: 500 }
    );
  }
}
