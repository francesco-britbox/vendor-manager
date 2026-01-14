/**
 * Timesheet Calendar API
 *
 * GET /api/timesheet-entries/calendar - Get calendar data for a team member
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getTeamMemberCalendar,
  type CalendarDayEntry,
} from '@/lib/timesheet';
import {
  requireViewPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse } from '@/types';

const calendarQuerySchema = z.object({
  teamMemberId: z.string().cuid('Invalid team member ID format'),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
});

export async function GET(request: Request) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      teamMemberId: searchParams.get('teamMemberId'),
      month: searchParams.get('month'),
      year: searchParams.get('year'),
    };

    // Validate query parameters
    const validation = calendarQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.error.issues.map((i) => i.message).join(', '),
        },
        { status: 400 }
      );
    }

    const { teamMemberId, month, year } = validation.data;

    // Get calendar data
    const calendarDays = await getTeamMemberCalendar(teamMemberId, month, year);

    return NextResponse.json<ApiResponse<{ calendar: CalendarDayEntry[]; month: number; year: number }>>({
      success: true,
      data: {
        calendar: calendarDays,
        month,
        year,
      },
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch calendar data',
      },
      { status: 500 }
    );
  }
}
