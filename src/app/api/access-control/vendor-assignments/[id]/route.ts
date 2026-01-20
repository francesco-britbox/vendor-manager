/**
 * Individual Vendor Assignment Management API
 *
 * DELETE - Remove a vendor assignment by ID
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminPermission, isErrorResponse } from '@/lib/api-permissions';
import type { ApiResponse } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/access-control/vendor-assignments/[id]
 * Remove a vendor assignment by ID
 */
export async function DELETE(request: Request, context: RouteContext) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { id } = await context.params;

    // Check if assignment exists
    const assignment = await prisma.deliveryManagerVendor.findUnique({
      where: { id },
      include: {
        user: {
          select: { name: true },
        },
        vendor: {
          select: { name: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Vendor assignment not found',
        },
        { status: 404 }
      );
    }

    // Delete the assignment
    await prisma.deliveryManagerVendor.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting vendor assignment:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to delete vendor assignment',
      },
      { status: 500 }
    );
  }
}
