/**
 * Integration Settings API
 *
 * GET /api/settings/integrations - Get integration settings (requires admin permission)
 * PUT /api/settings/integrations - Update integration settings (requires admin permission)
 */

import { NextResponse } from 'next/server';
import {
  getIntegrationSettings,
  updateIntegrationSettings,
  validateIntegrationSettings,
} from '@/lib/settings';
import {
  requireAdminPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, IntegrationSettings } from '@/types';

export async function GET() {
  try {
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const settings = await getIntegrationSettings();

    return NextResponse.json<ApiResponse<IntegrationSettings>>({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching integration settings:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch integration settings',
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
    const errors = validateIntegrationSettings(body);

    if (errors.length > 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: errors.map(e => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const settings = await updateIntegrationSettings(body, authResult.user.id);

    return NextResponse.json<ApiResponse<IntegrationSettings>>({
      success: true,
      data: settings,
      message: 'Integration settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating integration settings:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update integration settings',
      },
      { status: 500 }
    );
  }
}
