/**
 * Individual User Management API
 *
 * GET    - Get a specific user
 * PUT    - Update a user
 * DELETE - Delete a user
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminPermission, isErrorResponse } from '@/lib/api-permissions';
import { canDemoteSuperUser, getSuperUserCount, checkResourcePermission } from '@/lib/rbac';
import bcryptjs from 'bcryptjs';
import type { ApiResponse, UserForManagement } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/access-control/users/[id]
 * Get a specific user
 */
export async function GET(request: Request, { params }: RouteParams) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    const userForManagement: UserForManagement = {
      id: user.id,
      email: user.email,
      name: user.name,
      permissionLevel: user.permissionLevel,
      isActive: user.isActive,
      isSuperUser: user.isSuperUser,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      groups: user.groups.map((ug) => ({
        id: ug.group.id,
        name: ug.group.name,
      })),
      // Invitation status tracking
      status: user.status,
      invitationSentAt: user.invitationSentAt || undefined,
      invitationAcceptedAt: user.invitationAcceptedAt || undefined,
      passwordSetAt: user.passwordSetAt || undefined,
      // Email delivery tracking
      lastEmailSentAt: user.lastEmailSentAt || undefined,
      lastEmailDeliveryStatus: user.lastEmailDeliveryStatus || undefined,
      lastEmailError: user.lastEmailError || undefined,
    };

    return NextResponse.json<ApiResponse<UserForManagement>>({
      success: true,
      data: userForManagement,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to fetch user',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/access-control/users/[id]
 * Update a user
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const { email, name, password, permissionLevel, isActive, isSuperUser, groupIds } = body;

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Check if trying to demote the last super user
    if (existingUser.isSuperUser && isSuperUser === false) {
      const canDemote = await canDemoteSuperUser(id);
      if (!canDemote) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'Cannot demote the last super user. There must be at least one super user in the system.',
          },
          { status: 400 }
        );
      }
    }

    // Check if trying to deactivate the last super user
    if (existingUser.isSuperUser && existingUser.isActive && isActive === false) {
      const superUserCount = await getSuperUserCount();
      if (superUserCount <= 1) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'Cannot deactivate the last super user. There must be at least one active super user in the system.',
          },
          { status: 400 }
        );
      }
    }

    // Check if email is being changed and if it conflicts
    if (email && email !== existingUser.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email },
      });

      if (emailConflict) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'A user with this email already exists',
          },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (permissionLevel !== undefined) updateData.permissionLevel = permissionLevel;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isSuperUser !== undefined) updateData.isSuperUser = isSuperUser;

    // Hash password if provided
    if (password) {
      updateData.password = await bcryptjs.hash(password, 10);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Update group memberships if provided
    if (groupIds !== undefined) {
      // Delete existing memberships
      await prisma.userGroup.deleteMany({
        where: { userId: id },
      });

      // Create new memberships
      if (groupIds.length > 0) {
        await prisma.userGroup.createMany({
          data: groupIds.map((groupId: string) => ({
            userId: id,
            groupId,
          })),
        });
      }

      // Refetch user with updated groups
      const updatedUser = await prisma.user.findUnique({
        where: { id },
        include: {
          groups: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (updatedUser) {
        const userForManagement: UserForManagement = {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          permissionLevel: updatedUser.permissionLevel,
          isActive: updatedUser.isActive,
          isSuperUser: updatedUser.isSuperUser,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
          groups: updatedUser.groups.map((ug) => ({
            id: ug.group.id,
            name: ug.group.name,
          })),
          // Invitation status tracking
          status: updatedUser.status,
          invitationSentAt: updatedUser.invitationSentAt || undefined,
          invitationAcceptedAt: updatedUser.invitationAcceptedAt || undefined,
          passwordSetAt: updatedUser.passwordSetAt || undefined,
          // Email delivery tracking
          lastEmailSentAt: updatedUser.lastEmailSentAt || undefined,
          lastEmailDeliveryStatus: updatedUser.lastEmailDeliveryStatus || undefined,
          lastEmailError: updatedUser.lastEmailError || undefined,
        };

        return NextResponse.json<ApiResponse<UserForManagement>>({
          success: true,
          data: userForManagement,
          message: 'User updated successfully',
        });
      }
    }

    const userForManagement: UserForManagement = {
      id: user.id,
      email: user.email,
      name: user.name,
      permissionLevel: user.permissionLevel,
      isActive: user.isActive,
      isSuperUser: user.isSuperUser,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      groups: user.groups.map((ug) => ({
        id: ug.group.id,
        name: ug.group.name,
      })),
      // Invitation status tracking
      status: user.status,
      invitationSentAt: user.invitationSentAt || undefined,
      invitationAcceptedAt: user.invitationAcceptedAt || undefined,
      passwordSetAt: user.passwordSetAt || undefined,
      // Email delivery tracking
      lastEmailSentAt: user.lastEmailSentAt || undefined,
      lastEmailDeliveryStatus: user.lastEmailDeliveryStatus || undefined,
      lastEmailError: user.lastEmailError || undefined,
    };

    return NextResponse.json<ApiResponse<UserForManagement>>({
      success: true,
      data: userForManagement,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to update user',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/access-control/users/[id]
 * Delete a user
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  // Check RBAC permission for delete operation
  const deletePermission = await checkResourcePermission(
    authResult.user.id,
    'component:user-delete'
  );
  if (!deletePermission.allowed) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'You do not have permission to delete users',
      },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // Prevent deleting the last super user
    if (existingUser.isSuperUser) {
      const superUserCount = await getSuperUserCount();
      if (superUserCount <= 1) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'Cannot delete the last super user. There must be at least one super user in the system.',
          },
          { status: 400 }
        );
      }
    }

    // Prevent self-deletion
    if (existingUser.id === authResult.user.id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'You cannot delete your own account',
        },
        { status: 400 }
      );
    }

    // Delete user (cascade will handle group memberships)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to delete user',
      },
      { status: 500 }
    );
  }
}
