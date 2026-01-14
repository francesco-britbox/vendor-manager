/**
 * Currency Settings API
 *
 * GET /api/settings/currency - Get currency settings (requires admin permission)
 * PUT /api/settings/currency - Update currency settings (requires admin permission)
 */

import { NextResponse } from 'next/server';
import {
  getCurrencySettings,
  updateCurrencySettings,
  validateCurrencySettings,
} from '@/lib/settings';
import {
  requireAdminPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, CurrencySettings } from '@/types';

export async function GET() {
  try {
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const settings = await getCurrencySettings();

    return NextResponse.json<ApiResponse<CurrencySettings>>({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching currency settings:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch currency settings',
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
    const errors = validateCurrencySettings(body);

    if (errors.length > 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: errors.map(e => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const settings = await updateCurrencySettings(body, authResult.user.id);

    return NextResponse.json<ApiResponse<CurrencySettings>>({
      success: true,
      data: settings,
      message: 'Currency settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating currency settings:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update currency settings',
      },
      { status: 500 }
    );
  }
}
