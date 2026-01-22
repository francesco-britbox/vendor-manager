/**
 * Link Categories API
 *
 * GET /api/quick-links/categories - List all categories
 * POST /api/quick-links/categories - Create a new category (requires admin permission)
 */

import { NextResponse } from 'next/server';
import {
  getAllCategories,
  createCategory,
  validateCreateCategoryInput,
  initializeDefaultCategories,
  getLinkCountByCategory,
} from '@/lib/quick-links';
import {
  requireViewPermission,
  requireAdminPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import { checkResourcePermission } from '@/lib/rbac';
import type { ApiResponse, LinkCategory } from '@/types';

export async function GET(request: Request) {
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

    // Initialize default categories if needed
    await initializeDefaultCategories();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeLinkCounts = searchParams.get('includeLinkCounts') === 'true';

    const categories = await getAllCategories();
    const linkCounts = includeLinkCounts ? await getLinkCountByCategory() : null;

    // Add link counts to categories if requested
    const categoriesWithCounts = includeLinkCounts
      ? categories.map((cat) => ({
          ...cat,
          linkCount: linkCounts?.[cat.id] || 0,
        }))
      : categories;

    return NextResponse.json<
      ApiResponse<{
        categories: (LinkCategory & { linkCount?: number })[];
      }>
    >({
      success: true,
      data: {
        categories: categoriesWithCounts,
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check admin permission - only admins can create categories
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

    const body = await request.json();

    // Validate input using Zod schema
    const validation = validateCreateCategoryInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const category = await createCategory(validation.data);

    return NextResponse.json<ApiResponse<LinkCategory>>(
      {
        success: true,
        data: category,
        message: 'Category created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create category',
      },
      { status: 500 }
    );
  }
}
