/**
 * Vendor API - Single Resource
 *
 * GET /api/vendors/[id] - Get a vendor by ID (requires view permission)
 * PUT /api/vendors/[id] - Update a vendor by ID (requires write permission)
 * DELETE /api/vendors/[id] - Delete a vendor by ID (requires write permission)
 */

import { NextResponse } from 'next/server';
import {
  getVendorById,
  updateVendor,
  deleteVendor,
  validateUpdateVendorInput,
  validateVendorId,
} from '@/lib/vendors';
import {
  requireViewPermission,
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse, Vendor } from '@/types';

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
    const idValidation = validateVendorId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const vendor = await getVendorById(id);

    if (!vendor) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Vendor not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Vendor>>({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch vendor',
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
    const idValidation = validateVendorId(id);
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
    const validation = validateUpdateVendorInput(body);
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

    const vendor = await updateVendor(id, validation.data);

    if (!vendor) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Vendor not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Vendor>>({
      success: true,
      data: vendor,
      message: 'Vendor updated successfully',
    });
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update vendor',
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

    const { id } = await params;

    // Validate ID
    const idValidation = validateVendorId(id);
    if (!idValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: idValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    const deleted = await deleteVendor(id);

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Vendor not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
      message: 'Vendor deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete vendor',
      },
      { status: 500 }
    );
  }
}
