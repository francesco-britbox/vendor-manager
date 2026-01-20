/**
 * Vendor RAID Log API
 *
 * GET /api/reporting/vendors/[id]/raid - Get all RAID items for a vendor
 * POST /api/reporting/vendors/[id]/raid - Create a new RAID item
 */

import { NextResponse } from 'next/server';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  getVendorRaidItems,
  createRaidItem,
  userHasVendorAccess,
  validateRaidItem,
} from '@/lib/reporting';
import type { ApiResponse } from '@/types';
import type { RaidItem } from '@/types/delivery-reporting';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: vendorId } = await params;

    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const userId = authResult.user.id;
    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User ID not found' },
        { status: 401 }
      );
    }

    // Check if user has access to this vendor
    const hasAccess = await userHasVendorAccess(userId, vendorId);
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    const raidItems = await getVendorRaidItems(vendorId);

    return NextResponse.json<ApiResponse<{ items: RaidItem[] }>>({
      success: true,
      data: { items: raidItems },
    });
  } catch (error) {
    console.error('Error fetching RAID items:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch RAID items',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: vendorId } = await params;

    // Check write permission
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const userId = authResult.user.id;
    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User ID not found' },
        { status: 401 }
      );
    }

    // Check if user has access to this vendor
    const hasAccess = await userHasVendorAccess(userId, vendorId);
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = validateRaidItem(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: Object.values(validation.errors).flat().join(', '),
        },
        { status: 400 }
      );
    }

    const item = await createRaidItem(vendorId, validation.data);

    return NextResponse.json<ApiResponse<RaidItem>>(
      {
        success: true,
        data: item,
        message: 'RAID item created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating RAID item:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create RAID item',
      },
      { status: 500 }
    );
  }
}
