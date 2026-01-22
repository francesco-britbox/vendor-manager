/**
 * Quick Link API - Single Resource
 *
 * GET /api/quick-links/[id] - Get a quick link by ID
 * PUT /api/quick-links/[id] - Update a quick link by ID (requires admin permission)
 * DELETE /api/quick-links/[id] - Delete a quick link by ID (requires admin permission)
 */

import { NextResponse } from 'next/server';
import {
  getQuickLinkById,
  updateQuickLink,
  deleteQuickLink,
  validateUpdateQuickLinkInput,
  validateId,
} from '@/lib/quick-links';
import {
  requireViewPermission,
  requireAdminPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import { checkResourcePermission } from '@/lib/rbac';
import type { ApiResponse, QuickLinkWithCategory } from '@/types';

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

    // Check RBAC permission
    const permission = await checkResourcePermission(
      authResult.user.id,
      'page:quick-links'
    );
    if (!permission.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'You do not have permission to view quick links',
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Validate ID
    const idValidation = validateId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const link = await getQuickLinkById(id);

    if (!link) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Quick link not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<QuickLinkWithCategory>>({
      success: true,
      data: link,
    });
  } catch (error) {
    console.error('Error fetching quick link:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch quick link',
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
    // Check admin permission - only admins can edit links
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Check RBAC permission for editing quick links
    const permission = await checkResourcePermission(
      authResult.user.id,
      'component:quick-links-edit'
    );
    if (!permission.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'You do not have permission to edit quick links',
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Validate ID
    const idValidation = validateId(id);
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
    const validation = validateUpdateQuickLinkInput(body);
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

    const link = await updateQuickLink(id, validation.data);

    if (!link) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Quick link not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<QuickLinkWithCategory>>({
      success: true,
      data: link,
      message: 'Quick link updated successfully',
    });
  } catch (error) {
    console.error('Error updating quick link:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update quick link',
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
    // Check admin permission - only admins can delete links
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Check RBAC permission for deleting quick links
    const permission = await checkResourcePermission(
      authResult.user.id,
      'component:quick-links-delete'
    );
    if (!permission.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'You do not have permission to delete quick links',
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Validate ID
    const idValidation = validateId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const deleted = await deleteQuickLink(id);

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Quick link not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
      message: 'Quick link deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting quick link:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete quick link',
      },
      { status: 500 }
    );
  }
}
