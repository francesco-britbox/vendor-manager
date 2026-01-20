/**
 * Groups Management API
 *
 * GET  - List all permission groups
 * POST - Create a new group
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminPermission, isErrorResponse } from '@/lib/api-permissions';
import type { ApiResponse, GroupWithCounts } from '@/types';

/**
 * GET /api/access-control/groups
 * List all permission groups with member and permission counts
 */
export async function GET(request: Request) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get groups with counts
    const [groups, total] = await Promise.all([
      prisma.permissionGroup.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              resourcePermissions: true,
            },
          },
        },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        take: limit,
        skip: offset,
      }),
      prisma.permissionGroup.count({ where }),
    ]);

    // Transform to response format
    const groupsWithCounts: GroupWithCounts[] = groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description || undefined,
      isSystem: group.isSystem,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      memberCount: group._count.users,
      permissionCount: group._count.resourcePermissions,
    }));

    return NextResponse.json<ApiResponse<{ groups: GroupWithCounts[]; total: number }>>({
      success: true,
      data: {
        groups: groupsWithCounts,
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to fetch groups',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/access-control/groups
 * Create a new permission group
 */
export async function POST(request: Request) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const body = await request.json();
    const { name, description } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Group name is required',
        },
        { status: 400 }
      );
    }

    // Check if group name already exists
    const existingGroup = await prisma.permissionGroup.findUnique({
      where: { name: name.trim() },
    });

    if (existingGroup) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'A group with this name already exists',
        },
        { status: 400 }
      );
    }

    // Create group
    const group = await prisma.permissionGroup.create({
      data: {
        name: name.trim(),
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
      message: 'Group created successfully',
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to create group',
      },
      { status: 500 }
    );
  }
}
