/**
 * Format Settings API
 *
 * GET /api/settings/formats - Get format settings (requires admin permission)
 * PUT /api/settings/formats - Update format settings (requires admin permission)
 */

import { NextResponse } from 'next/server';
import {
  getFormatSettings,
  updateFormatSettings,
  validateFormatSettings,
} from '@/lib/settings';
import {
  requireAdminPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, FormatSettings } from '@/types';

export async function GET() {
  try {
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const settings = await getFormatSettings();

    return NextResponse.json<ApiResponse<FormatSettings>>({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching format settings:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch format settings',
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
    const errors = validateFormatSettings(body);

    if (errors.length > 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: errors.map(e => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const settings = await updateFormatSettings(body, authResult.user.id);

    return NextResponse.json<ApiResponse<FormatSettings>>({
      success: true,
      data: settings,
      message: 'Format settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating format settings:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update format settings',
      },
      { status: 500 }
    );
  }
}
