/**
 * Link Category API - Single Resource
 *
 * GET /api/quick-links/categories/[id] - Get a category by ID
 * PUT /api/quick-links/categories/[id] - Update a category by ID (requires admin permission)
 * DELETE /api/quick-links/categories/[id] - Delete a category by ID (requires admin permission)
 */

import { NextResponse } from 'next/server';
import {
  getCategoryById,
  updateCategory,
  deleteCategory,
  validateUpdateCategoryInput,
  validateId,
  categoryHasLinks,
} from '@/lib/quick-links';
import {
  requireViewPermission,
  requireAdminPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import { checkResourcePermission } from '@/lib/rbac';
import type { ApiResponse, LinkCategory } from '@/types';

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
          error: 'You do not have permission to view categories',
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

    const category = await getCategoryById(id);

    if (!category) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Category not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<LinkCategory>>({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch category',
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
    // Check admin permission - only admins can edit categories
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Check RBAC permission for managing categories
    const permission = await checkResourcePermission(
      authResult.user.id,
      'component:quick-links-categories'
    );
    if (!permission.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'You do not have permission to manage categories',
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
    const validation = validateUpdateCategoryInput(body);
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

    const category = await updateCategory(id, validation.data);

    if (!category) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Category not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<LinkCategory>>({
      success: true,
      data: category,
      message: 'Category updated successfully',
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update category',
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
    // Check admin permission - only admins can delete categories
    const authResult = await requireAdminPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Check RBAC permission for managing categories
    const permission = await checkResourcePermission(
      authResult.user.id,
      'component:quick-links-categories'
    );
    if (!permission.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'You do not have permission to manage categories',
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

    // Check if category has links (warn the user)
    const hasLinks = await categoryHasLinks(id);

    // Proceed with deletion (links will be reassigned to Generic)
    const deleted = await deleteCategory(id);

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Category not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean; linksReassigned: boolean }>>({
      success: true,
      data: {
        deleted: true,
        linksReassigned: hasLinks,
      },
      message: hasLinks
        ? 'Category deleted successfully. Existing links have been reassigned to Generic category.'
        : 'Category deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete category',
      },
      { status: 500 }
    );
  }
}
