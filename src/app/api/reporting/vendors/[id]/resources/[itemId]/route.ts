/**
 * Vendor Resource Item API
 *
 * PUT /api/reporting/vendors/[id]/resources/[itemId] - Update a resource
 * DELETE /api/reporting/vendors/[id]/resources/[itemId] - Delete a resource
 */

import { NextResponse } from 'next/server';
import { requireWritePermission, isErrorResponse } from '@/lib/api-permissions';
import {
  updateVendorResource,
  deleteVendorResource,
  userHasVendorAccess,
  validateVendorResource,
} from '@/lib/reporting';
import type { ApiResponse } from '@/types';
import type { VendorResourceItem } from '@/types/delivery-reporting';

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
    const validation = validateVendorResource({ ...body, id: itemId });
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: Object.values(validation.errors).flat().join(', '),
        },
        { status: 400 }
      );
    }

    const resource = await updateVendorResource(itemId, validation.data);

    return NextResponse.json<ApiResponse<VendorResourceItem>>({
      success: true,
      data: resource,
      message: 'Resource updated successfully',
    });
  } catch (error) {
    console.error('Error updating resource:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update resource',
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

    await deleteVendorResource(itemId);

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: 'Resource deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete resource',
      },
      { status: 500 }
    );
  }
}
