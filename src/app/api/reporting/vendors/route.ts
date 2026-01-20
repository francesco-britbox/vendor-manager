/**
 * Reporting Vendors API
 *
 * GET /api/reporting/vendors - Get vendors assigned to the current user for delivery management
 */

import { NextResponse } from 'next/server';
import { requireViewPermission, isErrorResponse } from '@/lib/api-permissions';
import { getAssignedVendors } from '@/lib/reporting';
import type { ApiResponse } from '@/types';
import type { AssignedVendor } from '@/types/delivery-reporting';

export async function GET() {
  try {
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

    const vendors = await getAssignedVendors(userId);

    return NextResponse.json<ApiResponse<{ vendors: AssignedVendor[] }>>({
      success: true,
      data: { vendors },
    });
  } catch (error) {
    console.error('Error fetching assigned vendors:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch assigned vendors',
      },
      { status: 500 }
    );
  }
}
