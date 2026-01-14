/**
 * Reports API
 *
 * GET /api/reports - Get list of available report types
 * POST /api/reports - Generate a specific report
 *
 * Query parameters for POST:
 * - type: Report type (vendor-spend, team-utilization, timesheets, time-off, invoice-validation, contract-status)
 *
 * Body parameters:
 * - dateFrom: Start date for filtering (ISO string)
 * - dateTo: End date for filtering (ISO string)
 * - vendorIds: Array of vendor IDs to filter
 * - teamMemberIds: Array of team member IDs to filter
 * - status: Array of statuses to filter
 * - currency: Currency code to filter
 */

import { NextResponse } from 'next/server';
import {
  requireViewPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import { generateReport, reportGenerators } from '@/lib/reports';
import type { ApiResponse } from '@/types';
import type { ReportFilters, ReportType } from '@/types/reports';

// Report type descriptions
const REPORT_TYPES = [
  {
    id: 'vendor-spend',
    name: 'Vendor Spend',
    description: 'Summary of spend by vendor including invoice status breakdown',
    icon: 'building-2',
  },
  {
    id: 'team-utilization',
    name: 'Team Utilization',
    description: 'Team member utilization rates and work statistics',
    icon: 'users',
  },
  {
    id: 'timesheets',
    name: 'Timesheets',
    description: 'Detailed timesheet entries including hours worked and time off',
    icon: 'clock',
  },
  {
    id: 'time-off',
    name: 'Time Off',
    description: 'Summary of time off taken by team members',
    icon: 'calendar-off',
  },
  {
    id: 'invoice-validation',
    name: 'Invoice Validation',
    description: 'Invoice validation status with discrepancy analysis',
    icon: 'file-check',
  },
  {
    id: 'contract-status',
    name: 'Contract Status',
    description: 'Contract status overview with expiration tracking',
    icon: 'file-text',
  },
];

export async function GET() {
  try {
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    return NextResponse.json<ApiResponse<typeof REPORT_TYPES>>({
      success: true,
      data: REPORT_TYPES,
    });
  } catch (error) {
    console.error('Error fetching report types:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch report types',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type');

    if (!reportType) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Report type is required. Use ?type=vendor-spend|team-utilization|timesheets|time-off|invoice-validation|contract-status',
        },
        { status: 400 }
      );
    }

    if (!reportGenerators[reportType]) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `Invalid report type: ${reportType}. Valid types are: ${Object.keys(reportGenerators).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Parse filters from request body
    let filters: ReportFilters = {};
    try {
      const body = await request.json();
      filters = {
        dateFrom: body.dateFrom,
        dateTo: body.dateTo,
        vendorIds: body.vendorIds,
        teamMemberIds: body.teamMemberIds,
        status: body.status,
        currency: body.currency,
      };
    } catch {
      // No body or invalid JSON, use empty filters
    }

    const report = await generateReport(reportType, filters);

    return NextResponse.json<ApiResponse<unknown>>({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      },
      { status: 500 }
    );
  }
}
