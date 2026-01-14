/**
 * Timesheet Entries API
 *
 * GET /api/timesheet-entries - List timesheet entries with optional filtering
 * POST /api/timesheet-entries - Create or update timesheet entries (single or bulk)
 */

import { NextResponse } from 'next/server';
import {
  getTimesheetEntries,
  upsertTimesheetEntry,
  bulkUpsertTimesheetEntries,
  validateTimesheetEntryInput,
  validateBulkTimesheetEntriesInput,
  getMonthlyTimesheetSummary,
  getTimesheetStats,
  type TimesheetEntryWithMember,
  type MonthlyTimesheetSummary,
} from '@/lib/timesheet';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, TimesheetEntry } from '@/types';

export async function GET(request: Request) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const teamMemberId = searchParams.get('teamMemberId');
    const teamMemberIds = searchParams.get('teamMemberIds');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const includeSummary = searchParams.get('includeSummary') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';

    // Build query options
    const queryOptions: {
      teamMemberId?: string;
      teamMemberIds?: string[];
      dateFrom?: Date;
      dateTo?: Date;
      month?: number;
      year?: number;
    } = {};

    if (teamMemberId) {
      queryOptions.teamMemberId = teamMemberId;
    }

    if (teamMemberIds) {
      queryOptions.teamMemberIds = teamMemberIds.split(',').filter(Boolean);
    }

    if (dateFrom) {
      queryOptions.dateFrom = new Date(dateFrom);
    }

    if (dateTo) {
      queryOptions.dateTo = new Date(dateTo);
    }

    if (month && year) {
      queryOptions.month = parseInt(month, 10);
      queryOptions.year = parseInt(year, 10);
    }

    // Fetch entries
    const { entries, total } = await getTimesheetEntries(queryOptions);

    // Optionally fetch summary
    let summary: MonthlyTimesheetSummary[] | undefined;
    if (includeSummary && queryOptions.month && queryOptions.year) {
      summary = await getMonthlyTimesheetSummary(
        queryOptions.month,
        queryOptions.year,
        queryOptions.teamMemberIds || (queryOptions.teamMemberId ? [queryOptions.teamMemberId] : undefined)
      );
    }

    // Optionally fetch stats
    let stats: {
      totalTeamMembers: number;
      totalHoursLogged: number;
      totalSpend: number;
      averageHoursPerMember: number;
      timeOffDays: number;
    } | undefined;
    if (includeStats && queryOptions.month && queryOptions.year) {
      stats = await getTimesheetStats(queryOptions.month, queryOptions.year);
    }

    return NextResponse.json<
      ApiResponse<{
        entries: TimesheetEntryWithMember[];
        total: number;
        summary?: MonthlyTimesheetSummary[];
        stats?: typeof stats;
      }>
    >({
      success: true,
      data: {
        entries,
        total,
        ...(summary && { summary }),
        ...(stats && { stats }),
      },
    });
  } catch (error) {
    console.error('Error fetching timesheet entries:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch timesheet entries',
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

    const body = await request.json();

    // Check if this is a bulk operation
    if (body.entries && Array.isArray(body.entries)) {
      // Validate bulk input
      const validation = validateBulkTimesheetEntriesInput(body);
      if (!validation.valid || !validation.data) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: validation.errors.join(', '),
          },
          { status: 400 }
        );
      }

      const result = await bulkUpsertTimesheetEntries(validation.data.entries);

      return NextResponse.json<ApiResponse<{ created: number; updated: number; deleted: number }>>(
        {
          success: true,
          data: result,
          message: `Timesheet entries processed: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted`,
        },
        { status: 200 }
      );
    }

    // Single entry operation
    const validation = validateTimesheetEntryInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const entry = await upsertTimesheetEntry(validation.data);

    return NextResponse.json<ApiResponse<TimesheetEntry>>(
      {
        success: true,
        data: entry,
        message: 'Timesheet entry saved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving timesheet entry:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save timesheet entry',
      },
      { status: 500 }
    );
  }
}
