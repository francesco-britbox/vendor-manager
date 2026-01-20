/**
 * Permission Check API
 *
 * POST - Check if current user has access to specific resources
 */

import { NextResponse } from 'next/server';
import { requireViewPermission, isErrorResponse } from '@/lib/api-permissions';
import {
  checkResourcePermission,
  getUserEffectivePermissions,
  getAccessiblePagePaths,
} from '@/lib/rbac';
import type { ApiResponse, ResourcePermissionCheck, UserEffectivePermissions } from '@/types';

/**
 * POST /api/access-control/check
 * Check if current user has access to specific resources
 * Body: { resourceKeys: string[] } or { path: string }
 */
export async function POST(request: Request) {
  const authResult = await requireViewPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const body = await request.json();
    const { resourceKeys, path } = body;
    const userId = authResult.user.id;

    // Check single path
    if (path) {
      const check = await checkResourcePermission(
        userId,
        `page:${path.replace(/^\//, '').replace(/\//g, '-')}`
      );

      return NextResponse.json<ApiResponse<ResourcePermissionCheck>>({
        success: true,
        data: check,
      });
    }

    // Check multiple resource keys
    if (Array.isArray(resourceKeys) && resourceKeys.length > 0) {
      const checks: Record<string, ResourcePermissionCheck> = {};

      for (const key of resourceKeys) {
        checks[key] = await checkResourcePermission(userId, key);
      }

      return NextResponse.json<ApiResponse<Record<string, ResourcePermissionCheck>>>({
        success: true,
        data: checks,
      });
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Invalid request. Provide resourceKeys array or path string.',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error checking permissions:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to check permissions',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/access-control/check
 * Get current user's effective permissions
 */
export async function GET(request: Request) {
  const authResult = await requireViewPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'all', 'pages', or null for all

    const userId = authResult.user.id;

    if (type === 'pages') {
      const paths = await getAccessiblePagePaths(userId);
      return NextResponse.json<ApiResponse<{ accessiblePaths: string[] }>>({
        success: true,
        data: { accessiblePaths: paths },
      });
    }

    const permissions = await getUserEffectivePermissions(userId);

    if (!permissions) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Failed to get user permissions',
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<UserEffectivePermissions>>({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error('Error getting permissions:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to get permissions',
      },
      { status: 500 }
    );
  }
}
