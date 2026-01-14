/**
 * Contract Analysis API
 *
 * POST /api/contracts/[id]/analyze - Trigger AI analysis for a contract
 * GET /api/contracts/[id]/analyze - Get existing analysis for a contract
 * DELETE /api/contracts/[id]/analyze - Delete analysis for a contract
 */

import { NextResponse } from 'next/server';
import {
  requireWritePermission,
  requireViewPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  analyzeContractDocument,
  getContractAnalysis,
  deleteContractAnalysis,
  getAnalysisStatus,
  type ContractAnalysisResult,
} from '@/lib/contract-analyzer';
import { validateContractId } from '@/lib/contracts';
import type { ApiResponse, ContractAnalysis } from '@/types';

/**
 * Response type for analysis endpoint
 */
interface AnalyzeResponse {
  analysis: ContractAnalysis;
  details?: {
    provider?: string;
    textLength?: number;
    pageCount?: number;
    processingTime?: number;
  };
}

/**
 * POST - Trigger AI analysis for a contract
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require write permission to trigger analysis
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

    // Parse request body for options
    let force = false;
    try {
      const body = await request.json();
      force = body?.force === true;
    } catch {
      // No body or invalid JSON is fine
    }

    // Run analysis
    const result: ContractAnalysisResult = await analyzeContractDocument(id, { force });

    if (!result.success || !result.analysis) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: result.error || 'Analysis failed',
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<AnalyzeResponse>>({
      success: true,
      data: {
        analysis: result.analysis,
        details: result.details,
      },
      message: result.details?.provider === 'cached'
        ? 'Analysis retrieved from cache'
        : 'Contract analyzed successfully',
    });
  } catch (error) {
    console.error('Error analyzing contract:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze contract',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get existing analysis for a contract
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require view permission to see analysis
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

    // Check URL for status request
    const url = new URL(request.url);
    if (url.searchParams.get('status') === 'true') {
      const status = await getAnalysisStatus(id);
      return NextResponse.json<ApiResponse<typeof status>>({
        success: true,
        data: status,
      });
    }

    // Get existing analysis
    const analysis = await getContractAnalysis(id);

    if (!analysis) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'No analysis found for this contract',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<ContractAnalysis>>({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Error getting contract analysis:', error);
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
 * DELETE - Delete analysis for a contract
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require write permission to delete analysis
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

    // Delete analysis
    const deleted = await deleteContractAnalysis(id);

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
    console.error('Error deleting contract analysis:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete analysis',
      },
      { status: 500 }
    );
  }
}
