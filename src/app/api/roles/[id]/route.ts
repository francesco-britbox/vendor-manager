/**
 * Role API - Single Resource
 *
 * GET /api/roles/[id] - Get a role by ID (requires view permission)
 * PUT /api/roles/[id] - Update a role by ID (requires write permission)
 * DELETE /api/roles/[id] - Delete a role by ID (requires write permission)
 */

import { NextResponse } from 'next/server';
import {
  getRoleById,
  updateRole,
  deleteRole,
  validateUpdateRoleInput,
  validateRoleId,
} from '@/lib/roles';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import { checkResourcePermission } from '@/lib/rbac';
import type { ApiResponse, Role } from '@/types';

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
    const idValidation = validateRoleId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const role = await getRoleById(id);

    if (!role) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Role not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Role>>({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch role',
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
    const idValidation = validateRoleId(id);
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
    const validation = validateUpdateRoleInput(body);
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

    const role = await updateRole(id, validation.data);

    if (!role) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Role not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Role>>({
      success: true,
      data: role,
      message: 'Role updated successfully',
    });
  } catch (error) {
    console.error('Error updating role:', error);

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
        error: error instanceof Error ? error.message : 'Failed to update role',
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

    // Check RBAC permission for delete operation
    const deletePermission = await checkResourcePermission(
      authResult.user.id,
      'component:role-delete'
    );
    if (!deletePermission.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'You do not have permission to delete roles',
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Validate ID
    const idValidation = validateRoleId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const deleted = await deleteRole(id);

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Role not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting role:', error);

    // Check for dependency error
    if (error instanceof Error && error.message.includes('Cannot delete role')) {
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
        error: error instanceof Error ? error.message : 'Failed to delete role',
      },
      { status: 500 }
    );
  }
}
