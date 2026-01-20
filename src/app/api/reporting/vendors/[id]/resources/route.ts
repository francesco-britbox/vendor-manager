/**
 * Vendor Resources API
 *
 * GET /api/reporting/vendors/[id]/resources - Get all resources for a vendor
 * POST /api/reporting/vendors/[id]/resources - Create a new resource
 */

import { NextResponse } from 'next/server';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import {
  getVendorResources,
  createVendorResource,
  userHasVendorAccess,
  validateVendorResource,
} from '@/lib/reporting';
import type { ApiResponse } from '@/types';
import type { VendorResourceItem } from '@/types/delivery-reporting';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: vendorId } = await params;

    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const userId = authResult.user.id;
    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User ID not found' },
        { status: 401 }
      );
    }

    // Check if user has access to this vendor
    const hasAccess = await userHasVendorAccess(userId, vendorId);
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    const resources = await getVendorResources(vendorId);

    return NextResponse.json<ApiResponse<{ items: VendorResourceItem[] }>>({
      success: true,
      data: { items: resources },
    });
  } catch (error) {
    console.error('Error fetching vendor resources:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch resources',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: vendorId } = await params;

    // Check write permission
    const authResult = await requireWritePermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    const userId = authResult.user.id;
    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User ID not found' },
        { status: 401 }
      );
    }

    // Check if user has access to this vendor
    const hasAccess = await userHasVendorAccess(userId, vendorId);
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'You do not have access to this vendor' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = validateVendorResource(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: Object.values(validation.errors).flat().join(', '),
        },
        { status: 400 }
      );
    }

    const resource = await createVendorResource(vendorId, validation.data);

    return NextResponse.json<ApiResponse<VendorResourceItem>>(
      {
        success: true,
        data: resource,
        message: 'Resource created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create resource',
      },
      { status: 500 }
    );
  }
}
