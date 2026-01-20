/**
 * Individual Group Management API
 *
 * GET    - Get a specific group with members
 * PUT    - Update a group
 * DELETE - Delete a group
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminPermission, isErrorResponse } from '@/lib/api-permissions';
import type { ApiResponse, GroupWithCounts } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/access-control/groups/[id]
 * Get a specific group with members
 */
export async function GET(request: Request, { params }: RouteParams) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id } = await params;

    const group = await prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                isActive: true,
                isSuperUser: true,
              },
            },
          },
        },
        resourcePermissions: {
          include: {
            resource: {
              select: {
                id: true,
                resourceKey: true,
                name: true,
                type: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
            resourcePermissions: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Group not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<typeof group>>({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to fetch group',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/access-control/groups/[id]
 * Update a group
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    // Get existing group
    const existingGroup = await prisma.permissionGroup.findUnique({
      where: { id },
    });

    if (!existingGroup) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Group not found',
        },
        { status: 404 }
      );
    }

    // Check if name is being changed and if it conflicts
    if (name && name.trim() !== existingGroup.name) {
      const nameConflict = await prisma.permissionGroup.findUnique({
        where: { name: name.trim() },
      });

      if (nameConflict) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'A group with this name already exists',
          },
          { status: 400 }
        );
      }
    }

    // Update group
    const group = await prisma.permissionGroup.update({
      where: { id },
      data: {
        name: name?.trim() || existingGroup.name,
        description: description?.trim() || null,
      },
      include: {
        _count: {
          select: {
            users: true,
            resourcePermissions: true,
          },
        },
      },
    });

    const groupWithCounts: GroupWithCounts = {
      id: group.id,
      name: group.name,
      description: group.description || undefined,
      isSystem: group.isSystem,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      memberCount: group._count.users,
      permissionCount: group._count.resourcePermissions,
    };

    return NextResponse.json<ApiResponse<GroupWithCounts>>({
      success: true,
      data: groupWithCounts,
      message: 'Group updated successfully',
    });
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to update group',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/access-control/groups/[id]
 * Delete a group
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id } = await params;

    // Get existing group
    const existingGroup = await prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!existingGroup) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Group not found',
        },
        { status: 404 }
      );
    }

    // Prevent deleting system groups
    if (existingGroup.isSystem) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Cannot delete system groups',
        },
        { status: 400 }
      );
    }

    // Delete group (cascade will handle memberships and permissions)
    await prisma.permissionGroup.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to delete group',
      },
      { status: 500 }
    );
  }
}
