/**
 * Vendor Timeline Item API
 *
 * PUT /api/reporting/vendors/[id]/timeline/[itemId] - Update a timeline milestone
 * DELETE /api/reporting/vendors/[id]/timeline/[itemId] - Delete a timeline milestone
 */

import { NextResponse } from 'next/server';
import { requireWritePermission, isErrorResponse } from '@/lib/api-permissions';
import {
  updateTimelineMilestone,
  deleteTimelineMilestone,
  userHasVendorAccess,
  validateTimelineMilestone,
} from '@/lib/reporting';
import type { ApiResponse } from '@/types';
import type { TimelineMilestone } from '@/types/delivery-reporting';

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

    // Build auth context for access checks
    const authContext = {
      permissionLevel: authResult.user.permissionLevel,
      isSuperUser: authResult.user.isSuperUser,
    };

    // Check if user has access to this vendor
    const hasAccess = await userHasVendorAccess(userId, vendorId, authContext);
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = validateTimelineMilestone({ ...body, id: itemId });
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: Object.values(validation.errors).flat().join(', '),
        },
        { status: 400 }
      );
    }

    const milestone = await updateTimelineMilestone(itemId, validation.data);

    return NextResponse.json<ApiResponse<TimelineMilestone>>({
      success: true,
      data: milestone,
      message: 'Timeline milestone updated successfully',
    });
  } catch (error) {
    console.error('Error updating timeline milestone:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update timeline milestone',
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

    // Build auth context for access checks
    const authContext = {
      permissionLevel: authResult.user.permissionLevel,
      isSuperUser: authResult.user.isSuperUser,
    };

    // Check if user has access to this vendor
    const hasAccess = await userHasVendorAccess(userId, vendorId, authContext);
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    await deleteTimelineMilestone(itemId);

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: 'Timeline milestone deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting timeline milestone:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete timeline milestone',
      },
      { status: 500 }
    );
  }
}
