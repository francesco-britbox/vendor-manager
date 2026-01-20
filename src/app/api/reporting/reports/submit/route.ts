/**
 * Report Submission API
 *
 * POST /api/reporting/reports/submit - Submit a weekly report
 */

import { NextResponse } from 'next/server';
import { requireWritePermission, isErrorResponse } from '@/lib/api-permissions';
import { submitWeeklyReport, userHasVendorAccess } from '@/lib/reporting';
import type { ApiResponse } from '@/types';
import type { WeeklyReportData } from '@/types/delivery-reporting';

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

    const body = await request.json();
    const { vendorId, weekStart } = body;

    if (!vendorId || !weekStart) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'vendorId and weekStart are required' },
        { status: 400 }
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

    // Submit the report
    const result = await submitWeeklyReport(vendorId, weekStart);

    if (!result.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: result.error || 'Failed to submit report' },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse<WeeklyReportData>>(
      {
        success: true,
        data: result.report,
        message: 'Report submitted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting report:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit report',
      },
      { status: 500 }
    );
  }
}
