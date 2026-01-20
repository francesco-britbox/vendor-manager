/**
 * Weekly Reports API
 *
 * GET /api/reporting/reports - Get a report for a specific vendor and week
 * POST /api/reporting/reports - Create or update a weekly report (upsert)
 */

import { NextResponse } from 'next/server';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  getWeeklyReport,
  getPreviousWeekFocus,
  upsertWeeklyReport,
  userHasVendorAccess,
  validateWeeklyReportPayload,
} from '@/lib/reporting';
import type { ApiResponse } from '@/types';
import type { WeeklyReportResponse, WeeklyReportData } from '@/types/delivery-reporting';

export async function GET(request: Request) {
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

    // Build auth context for access checks
    const authContext = {
      permissionLevel: authResult.user.permissionLevel,
      isSuperUser: authResult.user.isSuperUser,
    };

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const weekStart = searchParams.get('weekStart');

    if (!vendorId || !weekStart) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'vendorId and weekStart are required' },
        { status: 400 }
      );
    }

    // Check if user has access to this vendor
    const hasAccess = await userHasVendorAccess(userId, vendorId, authContext);
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    // Fetch the report
    const report = await getWeeklyReport(vendorId, weekStart);

    // If no report exists, get previous week's focus for pre-population
    let previousWeekFocus;
    if (!report) {
      previousWeekFocus = await getPreviousWeekFocus(vendorId, weekStart);
    }

    const response: WeeklyReportResponse = {
      report,
      previousWeekFocus: report ? undefined : previousWeekFocus,
      isNew: !report,
    };

    return NextResponse.json<ApiResponse<WeeklyReportResponse>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching weekly report:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch weekly report',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json();

    // Validate input
    const validation = validateWeeklyReportPayload(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: Object.values(validation.errors).flat().join(', '),
        },
        { status: 400 }
      );
    }

    // Check if user has access to this vendor
    const hasAccess = await userHasVendorAccess(userId, validation.data.vendorId, authContext);
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    // Upsert the report
    const report = await upsertWeeklyReport(validation.data);

    if (!report) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Failed to save report' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<WeeklyReportData>>(
      {
        success: true,
        data: report,
        message: 'Report saved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving weekly report:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save weekly report',
      },
      { status: 500 }
    );
  }
}
