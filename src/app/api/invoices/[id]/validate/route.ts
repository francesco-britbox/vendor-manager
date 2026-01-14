/**
 * Invoice Validation API
 *
 * POST /api/invoices/[id]/validate - Validate invoice against timesheet spend
 */

import { NextResponse } from 'next/server';
import {
  validateInvoiceAgainstTimesheet,
  validateInvoiceId,
} from '@/lib/invoices';
import {
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse } from '@/types';
import type { InvoiceValidationResult } from '@/lib/invoices';

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

    const { id } = await params;

    // Validate ID
    const idValidation = validateInvoiceId(id);
    if (!idValidation.valid || !idValidation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const validationResult = await validateInvoiceAgainstTimesheet(idValidation.data);

    if (!validationResult) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invoice not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<InvoiceValidationResult>>({
      success: true,
      data: validationResult,
      message: validationResult.isWithinTolerance
        ? 'Invoice is within tolerance threshold'
        : 'Invoice exceeds tolerance threshold',
    });
  } catch (error) {
    console.error('Error validating invoice:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate invoice',
      },
      { status: 500 }
    );
  }
}
