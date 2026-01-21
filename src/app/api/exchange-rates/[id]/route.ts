/**
 * Exchange Rate API - Single Resource
 *
 * DELETE /api/exchange-rates/[id] - Delete an exchange rate by ID (requires write permission)
 */

import { NextResponse } from 'next/server';
import { deleteExchangeRateById } from '@/lib/currency';
import {
  requireWritePermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import { checkResourcePermission } from '@/lib/rbac';
import type { ApiResponse } from '@/types';

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
      'component:exchange-rate-delete'
    );
    if (!deletePermission.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'You do not have permission to delete exchange rates',
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Exchange rate ID is required',
        },
        { status: 400 }
      );
    }

    const deleted = await deleteExchangeRateById(id);

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Exchange rate not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
      message: 'Exchange rate deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting exchange rate:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete exchange rate',
      },
      { status: 500 }
    );
  }
}
