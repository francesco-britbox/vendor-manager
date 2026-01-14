/**
 * Team Members API
 *
 * GET /api/team-members - List all team members (requires view permission)
 * POST /api/team-members - Create a new team member (requires write permission)
 */

import { NextResponse } from 'next/server';
import {
  getAllTeamMembers,
  getTeamMembers,
  createTeamMember,
  validateCreateTeamMemberInput,
  getTeamMemberStats,
} from '@/lib/team-members';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, TeamMember } from '@/types';

export async function GET(request: Request) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'active' | 'inactive' | 'onboarding' | 'offboarded' | null;
    const vendorId = searchParams.get('vendorId');
    const roleId = searchParams.get('roleId');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const includeStats = searchParams.get('includeStats') === 'true';

    // If no filters provided, return all team members
    if (!status && !vendorId && !roleId && !search && !limit && !offset) {
      const [teamMembers, stats] = await Promise.all([
        getAllTeamMembers(),
        includeStats ? getTeamMemberStats() : null,
      ]);

      return NextResponse.json<ApiResponse<{ teamMembers: TeamMember[]; stats?: typeof stats }>>({
        success: true,
        data: {
          teamMembers,
          ...(stats && { stats }),
        },
      });
    }

    // Apply filters
    const { teamMembers, total } = await getTeamMembers({
      status: status ?? undefined,
      vendorId: vendorId ?? undefined,
      roleId: roleId ?? undefined,
      search: search ?? undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    const stats = includeStats ? await getTeamMemberStats() : null;

    return NextResponse.json<
      ApiResponse<{
        teamMembers: TeamMember[];
        total: number;
        stats?: typeof stats;
      }>
    >({
      success: true,
      data: {
        teamMembers,
        total,
        ...(stats && { stats }),
      },
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch team members',
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

    // Validate input using Zod schema
    const validation = validateCreateTeamMemberInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const teamMember = await createTeamMember(validation.data);

    return NextResponse.json<ApiResponse<TeamMember>>(
      {
        success: true,
        data: teamMember,
        message: 'Team member created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating team member:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create team member',
      },
      { status: 500 }
    );
  }
}
