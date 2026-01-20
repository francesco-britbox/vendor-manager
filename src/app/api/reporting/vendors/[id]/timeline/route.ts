/**
 * Vendor Timeline API
 *
 * GET /api/reporting/vendors/[id]/timeline - Get all timeline milestones for a vendor
 * POST /api/reporting/vendors/[id]/timeline - Create a new timeline milestone
 */

import { NextResponse } from 'next/server';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  getVendorTimeline,
  createTimelineMilestone,
  userHasVendorAccess,
  validateTimelineMilestone,
} from '@/lib/reporting';
import type { ApiResponse } from '@/types';
import type { TimelineMilestone } from '@/types/delivery-reporting';

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

    const timeline = await getVendorTimeline(vendorId);

    return NextResponse.json<ApiResponse<{ items: TimelineMilestone[] }>>({
      success: true,
      data: { items: timeline },
    });
  } catch (error) {
    console.error('Error fetching vendor timeline:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch timeline',
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
    const validation = validateTimelineMilestone(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: Object.values(validation.errors).flat().join(', '),
        },
        { status: 400 }
      );
    }

    const milestone = await createTimelineMilestone(vendorId, validation.data);

    return NextResponse.json<ApiResponse<TimelineMilestone>>(
      {
        success: true,
        data: milestone,
        message: 'Timeline milestone created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating timeline milestone:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create timeline milestone',
      },
      { status: 500 }
    );
  }
}
