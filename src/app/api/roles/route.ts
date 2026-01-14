/**
 * Roles API
 *
 * GET /api/roles - List all roles (requires view permission)
 * POST /api/roles - Create a new role (requires write permission)
 */

import { NextResponse } from 'next/server';
import {
  getAllRoles,
  getRoles,
  createRole,
  validateCreateRoleInput,
  getRoleStats,
} from '@/lib/roles';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, Role } from '@/types';
import type { RoleWithUsage } from '@/lib/roles';

export async function GET(request: Request) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const includeStats = searchParams.get('includeStats') === 'true';

    // If no filters provided, return all roles
    if (!search && !limit && !offset) {
      const [roles, stats] = await Promise.all([
        getAllRoles(),
        includeStats ? getRoleStats() : null,
      ]);

      return NextResponse.json<ApiResponse<{ roles: RoleWithUsage[]; stats?: Awaited<ReturnType<typeof getRoleStats>> }>>({
        success: true,
        data: {
          roles,
          ...(stats && { stats }),
        },
      });
    }

    // Apply filters
    const { roles, total } = await getRoles({
      search: search ?? undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    const stats = includeStats ? await getRoleStats() : null;

    return NextResponse.json<
      ApiResponse<{
        roles: RoleWithUsage[];
        total: number;
        stats?: Awaited<ReturnType<typeof getRoleStats>>;
      }>
    >({
      success: true,
      data: {
        roles,
        total,
        ...(stats && { stats }),
      },
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch roles',
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
    const validation = validateCreateRoleInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const role = await createRole(validation.data);

    return NextResponse.json<ApiResponse<Role>>(
      {
        success: true,
        data: role,
        message: 'Role created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating role:', error);

    // Check for duplicate name error
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: error.message,
        },
        { status: 409 }
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create role',
      },
      { status: 500 }
    );
  }
}
