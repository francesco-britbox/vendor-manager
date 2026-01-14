/**
 * Dashboard Settings API
 *
 * GET /api/settings/dashboard - Get dashboard settings (requires admin permission)
 * PUT /api/settings/dashboard - Update dashboard settings (requires admin permission)
 */

import { NextResponse } from 'next/server';
import {
  getDashboardSettings,
  updateDashboardSettings,
  validateDashboardSettings,
} from '@/lib/settings';
import {
  requireAdminPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, DashboardSettings } from '@/types';

export async function GET() {
  try {
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const settings = await getDashboardSettings();

    return NextResponse.json<ApiResponse<DashboardSettings>>({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching dashboard settings:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard settings',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const body = await request.json();
    const errors = validateDashboardSettings(body);

    if (errors.length > 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: errors.map(e => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const settings = await updateDashboardSettings(body, authResult.user.id);

    return NextResponse.json<ApiResponse<DashboardSettings>>({
      success: true,
      data: settings,
      message: 'Dashboard settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating dashboard settings:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update dashboard settings',
      },
      { status: 500 }
    );
  }
}
