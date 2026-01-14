/**
 * Timesheet Entry API (Single Entry)
 *
 * GET /api/timesheet-entries/[id] - Get a specific timesheet entry
 * DELETE /api/timesheet-entries/[id] - Delete a timesheet entry
 */

import { NextResponse } from 'next/server';
import {
  getTimesheetEntryById,
  deleteTimesheetEntry,
  timesheetEntryIdSchema,
} from '@/lib/timesheet';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse } from '@/types';
import type { TimesheetEntryWithMember } from '@/lib/timesheet';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const { id } = await params;

    // Validate ID
    const idValidation = timesheetEntryIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid timesheet entry ID format',
        },
        { status: 400 }
      );
    }

    const entry = await getTimesheetEntryById(id);

    if (!entry) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Timesheet entry not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<TimesheetEntryWithMember>>({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error('Error fetching timesheet entry:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch timesheet entry',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // Check write permission
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const { id } = await params;

    // Validate ID
    const idValidation = timesheetEntryIdSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid timesheet entry ID format',
        },
        { status: 400 }
      );
    }

    // Check if entry exists
    const existing = await getTimesheetEntryById(id);
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Timesheet entry not found',
        },
        { status: 404 }
      );
    }

    const deleted = await deleteTimesheetEntry(id);

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Failed to delete timesheet entry',
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: { id },
      message: 'Timesheet entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting timesheet entry:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete timesheet entry',
      },
      { status: 500 }
    );
  }
}
