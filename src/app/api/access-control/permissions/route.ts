/**
 * Permissions Management API
 *
 * GET  - List all protectable resources with their assigned groups
 * PUT  - Update permission assignments for a resource
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminPermission, isErrorResponse } from '@/lib/api-permissions';
import type { ApiResponse, ResourceWithPermissions, ResourceType } from '@/types';

/**
 * GET /api/access-control/permissions
 * List all protectable resources with their assigned groups
 */
export async function GET(request: Request) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'page', 'component', or null for all
    const search = searchParams.get('search') || '';

    // Build where clause
    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (type === 'page' || type === 'component') {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { resourceKey: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get resources with their permissions
    const resources = await prisma.protectableResource.findMany({
      where,
      include: {
        permissions: {
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
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
    });

    // Transform to response format
    const resourcesWithPermissions: ResourceWithPermissions[] = resources.map((resource) => ({
      id: resource.id,
      resourceKey: resource.resourceKey,
      type: resource.type as ResourceType,
      name: resource.name,
      description: resource.description || undefined,
      parentKey: resource.parentKey || undefined,
      path: resource.path || undefined,
      sortOrder: resource.sortOrder,
      isActive: resource.isActive,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
      assignedGroups: resource.permissions.map((p) => ({
        id: p.group.id,
        name: p.group.name,
      })),
    }));

    // Also get all available groups for the UI
    const groups = await prisma.permissionGroup.findMany({
      select: {
        id: true,
        name: true,
        isSystem: true,
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json<ApiResponse<{
      resources: ResourceWithPermissions[];
      groups: typeof groups;
    }>>({
      success: true,
      data: {
        resources: resourcesWithPermissions,
        groups,
      },
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to fetch permissions',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/access-control/permissions
 * Update permission assignments for resources
 * Body: { assignments: [{ resourceId: string, groupIds: string[] }] }
 */
export async function PUT(request: Request) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const body = await request.json();
    const { assignments } = body;

    if (!Array.isArray(assignments)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid request body. Expected { assignments: [...] }',
        },
        { status: 400 }
      );
    }

    // Process each assignment
    for (const assignment of assignments) {
      const { resourceId, groupIds } = assignment;

      if (!resourceId) {
        continue;
      }

      // Verify resource exists
      const resource = await prisma.protectableResource.findUnique({
        where: { id: resourceId },
      });

      if (!resource) {
        continue;
      }

      // Delete existing permissions for this resource
      await prisma.resourcePermission.deleteMany({
        where: { resourceId },
      });

      // Create new permissions
      if (Array.isArray(groupIds) && groupIds.length > 0) {
        await prisma.resourcePermission.createMany({
          data: groupIds.map((groupId: string) => ({
            resourceId,
            groupId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: 'Permissions updated successfully',
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to update permissions',
      },
      { status: 500 }
    );
  }
}
