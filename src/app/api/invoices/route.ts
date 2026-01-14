/**
 * Invoices API
 *
 * GET /api/invoices - List all invoices (requires view permission)
 * POST /api/invoices - Create a new invoice (requires write permission)
 */

import { NextResponse } from 'next/server';
import {
  getAllInvoices,
  getInvoices,
  createInvoice,
  validateCreateInvoiceInput,
  getInvoiceStats,
} from '@/lib/invoices';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, InvoiceStatus } from '@/types';
import type { InvoiceWithVendor } from '@/lib/invoices';

export async function GET(request: Request) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as InvoiceStatus | null;
    const vendorId = searchParams.get('vendorId');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const includeStats = searchParams.get('includeStats') === 'true';

    // If no filters provided, return all invoices
    if (!status && !vendorId && !search && !limit && !offset && !dateFrom && !dateTo) {
      const [invoices, stats] = await Promise.all([
        getAllInvoices(),
        includeStats ? getInvoiceStats() : null,
      ]);

      return NextResponse.json<ApiResponse<{
        invoices: InvoiceWithVendor[];
        stats?: Awaited<ReturnType<typeof getInvoiceStats>>;
      }>>({
        success: true,
        data: {
          invoices,
          ...(stats && { stats }),
        },
      });
    }

    // Apply filters
    const { invoices, total } = await getInvoices({
      status: status ?? undefined,
      vendorId: vendorId ?? undefined,
      search: search ?? undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    const stats = includeStats ? await getInvoiceStats() : null;

    return NextResponse.json<
      ApiResponse<{
        invoices: InvoiceWithVendor[];
        total: number;
        stats?: Awaited<ReturnType<typeof getInvoiceStats>>;
      }>
    >({
      success: true,
      data: {
        invoices,
        total,
        ...(stats && { stats }),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch invoices',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check write permission
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const body = await request.json();

    // Validate input using Zod schema
    const validation = validateCreateInvoiceInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const invoice = await createInvoice(validation.data);

    return NextResponse.json<ApiResponse<InvoiceWithVendor>>(
      {
        success: true,
        data: invoice,
        message: 'Invoice created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invoice',
      },
      { status: 500 }
    );
  }
}
