/**
 * Vendor RAID Item API
 *
 * PUT /api/reporting/vendors/[id]/raid/[itemId] - Update a RAID item
 * DELETE /api/reporting/vendors/[id]/raid/[itemId] - Delete a RAID item
 */

import { NextResponse } from 'next/server';
import { requireWritePermission, isErrorResponse } from '@/lib/api-permissions';
import {
  updateRaidItem,
  deleteRaidItem,
  userHasVendorAccess,
  validateRaidItem,
} from '@/lib/reporting';
import type { ApiResponse } from '@/types';
import type { RaidItem } from '@/types/delivery-reporting';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id: vendorId, itemId } = await params;

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
    const validation = validateRaidItem({ ...body, id: itemId });
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: Object.values(validation.errors).flat().join(', '),
        },
        { status: 400 }
      );
    }

    const item = await updateRaidItem(itemId, validation.data);

    return NextResponse.json<ApiResponse<RaidItem>>({
      success: true,
      data: item,
      message: 'RAID item updated successfully',
    });
  } catch (error) {
    console.error('Error updating RAID item:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update RAID item',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: vendorId, itemId } = await params;

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

    await deleteRaidItem(itemId);

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: 'RAID item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting RAID item:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete RAID item',
      },
      { status: 500 }
    );
  }
}
