/**
 * Team Member API - Single Resource
 *
 * GET /api/team-members/[id] - Get a team member by ID (requires view permission)
 * PUT /api/team-members/[id] - Update a team member by ID (requires write permission)
 * DELETE /api/team-members/[id] - Delete a team member by ID (requires write permission)
 */

import { NextResponse } from 'next/server';
import {
  getTeamMemberById,
  updateTeamMember,
  deleteTeamMember,
  validateUpdateTeamMemberInput,
  validateTeamMemberId,
} from '@/lib/team-members';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, TeamMember } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const { id } = await params;

    // Validate ID
    const idValidation = validateTeamMemberId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const teamMember = await getTeamMemberById(id);

    if (!teamMember) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Team member not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<TeamMember>>({
      success: true,
      data: teamMember,
    });
  } catch (error) {
    console.error('Error fetching team member:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch team member',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check write permission
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const { id } = await params;

    // Validate ID
    const idValidation = validateTeamMemberId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input using Zod schema
    const validation = validateUpdateTeamMemberInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    // Check if there's anything to update
    if (Object.keys(validation.data).length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'No valid fields provided for update',
        },
        { status: 400 }
      );
    }

    const teamMember = await updateTeamMember(id, validation.data);

    if (!teamMember) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Team member not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<TeamMember>>({
      success: true,
      data: teamMember,
      message: 'Team member updated successfully',
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update team member',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check write permission
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const { id } = await params;

    // Validate ID
    const idValidation = validateTeamMemberId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const deleted = await deleteTeamMember(id);

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Team member not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
      message: 'Team member deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting team member:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete team member',
      },
      { status: 500 }
    );
  }
}
