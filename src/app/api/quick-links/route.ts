/**
 * Quick Links API
 *
 * GET /api/quick-links - List all quick links with pagination and search
 * POST /api/quick-links - Create a new quick link (requires admin/write permission and group membership)
 */

import { NextResponse } from 'next/server';
import {
  getQuickLinks,
  createQuickLink,
  validateCreateQuickLinkInput,
  initializeDefaultCategories,
  getQuickLinksStats,
} from '@/lib/quick-links';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import { checkResourcePermission } from '@/lib/rbac';
import type { ApiResponse, QuickLinkWithCategory } from '@/types';

export async function GET(request: Request) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Check RBAC permission for quick links
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

    // Initialize default categories if needed
    await initializeDefaultCategories();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');
    const sortBy = searchParams.get('sortBy') as 'category' | 'alphabetical' | 'custom' | null;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const includeStats = searchParams.get('includeStats') === 'true';

    const { links, total } = await getQuickLinks({
      search: search ?? undefined,
      categoryId: categoryId ?? undefined,
      sortBy: sortBy ?? 'category',
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    const stats = includeStats ? await getQuickLinksStats() : null;

    return NextResponse.json<
      ApiResponse<{
        links: QuickLinkWithCategory[];
        total: number;
        stats?: typeof stats;
      }>
    >({
      success: true,
      data: {
        links,
        total,
        ...(stats && { stats }),
      },
    });
  } catch (error) {
    console.error('Error fetching quick links:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch quick links',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check write permission - users need admin/write level to create links
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Check RBAC permission for creating quick links
    const permission = await checkResourcePermission(
      authResult.user.id,
      'component:quick-links-create'
    );
    if (!permission.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'You do not have permission to create quick links',
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input using Zod schema
    const validation = validateCreateQuickLinkInput(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const link = await createQuickLink(validation.data, authResult.user.id);

    return NextResponse.json<ApiResponse<QuickLinkWithCategory>>(
      {
        success: true,
        data: link,
        message: 'Quick link created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating quick link:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create quick link',
      },
      { status: 500 }
    );
  }
}
