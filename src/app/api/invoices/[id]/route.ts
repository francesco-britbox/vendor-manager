/**
 * Invoice Detail API
 *
 * GET /api/invoices/[id] - Get invoice by ID (requires view permission)
 * PUT /api/invoices/[id] - Update an invoice (requires write permission)
 * DELETE /api/invoices/[id] - Delete an invoice (requires write permission)
 */

import { NextResponse } from 'next/server';
import {
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  validateInvoiceId,
  validateUpdateInvoiceInput,
} from '@/lib/invoices';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse } from '@/types';
import type { InvoiceWithVendor } from '@/lib/invoices';

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

    const invoice = await getInvoiceById(idValidation.data);

    if (!invoice) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invoice not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<InvoiceWithVendor>>({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch invoice',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const body = await request.json();

    // Validate input using Zod schema
    const validation = validateUpdateInvoiceInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const invoice = await updateInvoice(idValidation.data, validation.data);

    if (!invoice) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invoice not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<InvoiceWithVendor>>({
      success: true,
      data: invoice,
      message: 'Invoice updated successfully',
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update invoice',
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

    const deleted = await deleteInvoice(idValidation.data);

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invoice not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: true,
        message: 'Invoice deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete invoice',
      },
      { status: 500 }
    );
  }
}
