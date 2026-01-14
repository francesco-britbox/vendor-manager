/**
 * Vendors API
 *
 * GET /api/vendors - List all vendors (requires view permission)
 * POST /api/vendors - Create a new vendor (requires write permission)
 */

import { NextResponse } from 'next/server';
import {
  getAllVendors,
  getVendors,
  createVendor,
  validateCreateVendorInput,
  getVendorStats,
} from '@/lib/vendors';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, Vendor } from '@/types';

export async function GET(request: Request) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'active' | 'inactive' | null;
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const includeStats = searchParams.get('includeStats') === 'true';

    // If no filters provided, return all vendors
    if (!status && !search && !limit && !offset) {
      const [vendors, stats] = await Promise.all([
        getAllVendors(),
        includeStats ? getVendorStats() : null,
      ]);

      return NextResponse.json<ApiResponse<{ vendors: Vendor[]; stats?: typeof stats }>>({
        success: true,
        data: {
          vendors,
          ...(stats && { stats }),
        },
      });
    }

    // Apply filters
    const { vendors, total } = await getVendors({
      status: status ?? undefined,
      search: search ?? undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    const stats = includeStats ? await getVendorStats() : null;

    return NextResponse.json<
      ApiResponse<{
        vendors: Vendor[];
        total: number;
        stats?: typeof stats;
      }>
    >({
      success: true,
      data: {
        vendors,
        total,
        ...(stats && { stats }),
      },
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch vendors',
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
    const validation = validateCreateVendorInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const vendor = await createVendor(validation.data);

    return NextResponse.json<ApiResponse<Vendor>>(
      {
        success: true,
        data: vendor,
        message: 'Vendor created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create vendor',
      },
      { status: 500 }
    );
  }
}
