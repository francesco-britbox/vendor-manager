/**
 * Settings API
 *
 * GET /api/settings - Get all system settings (requires admin permission)
 * PUT /api/settings - Update all system settings (requires admin permission)
 */

import { NextResponse } from 'next/server';
import {
  getAllSettings,
  updateCurrencySettings,
  updateFormatSettings,
  updateDashboardSettings,
  updateIntegrationSettings,
  validateCurrencySettings,
  validateFormatSettings,
  validateDashboardSettings,
  validateIntegrationSettings,
} from '@/lib/settings';
import {
  requireAdminPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, SystemSettings } from '@/types';

export async function GET() {
  try {
    // Check admin permission
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const settings = await getAllSettings();

    return NextResponse.json<ApiResponse<SystemSettings>>({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch settings',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // Check admin permission
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const body = await request.json();
    const userId = authResult.user.id;
    const allErrors: { category: string; errors: { field: string; message: string }[] }[] = [];

    // Validate and update each category if present
    if (body.currency) {
      const errors = validateCurrencySettings(body.currency);
      if (errors.length > 0) {
        allErrors.push({ category: 'currency', errors });
      }
    }

    if (body.formats) {
      const errors = validateFormatSettings(body.formats);
      if (errors.length > 0) {
        allErrors.push({ category: 'formats', errors });
      }
    }

    if (body.dashboard) {
      const errors = validateDashboardSettings(body.dashboard);
      if (errors.length > 0) {
        allErrors.push({ category: 'dashboard', errors });
      }
    }

    if (body.integrations) {
      const errors = validateIntegrationSettings(body.integrations);
      if (errors.length > 0) {
        allErrors.push({ category: 'integrations', errors });
      }
    }

    // Return validation errors if any
    if (allErrors.length > 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Validation failed',
          data: null,
        },
        { status: 400 }
      );
    }

    // Update each category
    const updatePromises: Promise<unknown>[] = [];

    if (body.currency) {
      updatePromises.push(updateCurrencySettings(body.currency, userId));
    }
    if (body.formats) {
      updatePromises.push(updateFormatSettings(body.formats, userId));
    }
    if (body.dashboard) {
      updatePromises.push(updateDashboardSettings(body.dashboard, userId));
    }
    if (body.integrations) {
      updatePromises.push(updateIntegrationSettings(body.integrations, userId));
    }

    await Promise.all(updatePromises);

    // Return updated settings
    const settings = await getAllSettings();

    return NextResponse.json<ApiResponse<SystemSettings>>({
      success: true,
      data: settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update settings',
      },
      { status: 500 }
    );
  }
}
