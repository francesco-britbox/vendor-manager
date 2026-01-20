/**
 * Vendor Assignments Management API
 *
 * GET  - List all vendor-to-user assignments with populated user and vendor details
 * POST - Create a new vendor assignment
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminPermission, isErrorResponse } from '@/lib/api-permissions';
import type { ApiResponse } from '@/types';

/**
 * Interface for vendor assignment response data
 */
export interface VendorAssignmentResponse {
  id: string;
  userId: string;
  vendorId: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
  vendor: {
    id: string;
    name: string;
    status: string;
  };
}

/**
 * GET /api/access-control/vendor-assignments
 * List all vendor-to-user assignments with populated user and vendor details
 */
export async function GET(request: Request) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause for search across user name, user email, and vendor name
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { vendor: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get assignments with user and vendor details
    const [assignments, total] = await Promise.all([
      prisma.deliveryManagerVendor.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
          vendor: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.deliveryManagerVendor.count({ where }),
    ]);

    // Transform to response format
    const assignmentsResponse: VendorAssignmentResponse[] = assignments.map((assignment) => ({
      id: assignment.id,
      userId: assignment.userId,
      vendorId: assignment.vendorId,
      createdAt: assignment.createdAt,
      user: {
        id: assignment.user.id,
        name: assignment.user.name,
        email: assignment.user.email,
        isActive: assignment.user.isActive,
      },
      vendor: {
        id: assignment.vendor.id,
        name: assignment.vendor.name,
        status: assignment.vendor.status,
      },
    }));

    return NextResponse.json<ApiResponse<{ assignments: VendorAssignmentResponse[]; total: number }>>({
      success: true,
      data: {
        assignments: assignmentsResponse,
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching vendor assignments:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to fetch vendor assignments',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/access-control/vendor-assignments
 * Create a new vendor assignment
 */
export async function POST(request: Request) {
  const authResult = await requireAdminPermission();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const body = await request.json();
    const { userId, vendorId } = body;

    // Validate required fields
    if (!userId || !vendorId) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'User ID and Vendor ID are required',
        },
        { status: 400 }
      );
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Cannot assign vendor to inactive user',
        },
        { status: 400 }
      );
    }

    // Verify vendor exists and is active
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, name: true, status: true },
    });

    if (!vendor) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Vendor not found',
        },
        { status: 404 }
      );
    }

    if (vendor.status !== 'active') {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Cannot assign inactive vendor to user',
        },
        { status: 400 }
      );
    }

    // Check for existing assignment (unique constraint: userId + vendorId)
    const existingAssignment = await prisma.deliveryManagerVendor.findUnique({
      where: {
        userId_vendorId: {
          userId,
          vendorId,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'This user is already assigned to this vendor',
        },
        { status: 409 }
      );
    }

    // Create the assignment
    const assignment = await prisma.deliveryManagerVendor.create({
      data: {
        userId,
        vendorId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    const assignmentResponse: VendorAssignmentResponse = {
      id: assignment.id,
      userId: assignment.userId,
      vendorId: assignment.vendorId,
      createdAt: assignment.createdAt,
      user: {
        id: assignment.user.id,
        name: assignment.user.name,
        email: assignment.user.email,
        isActive: assignment.user.isActive,
      },
      vendor: {
        id: assignment.vendor.id,
        name: assignment.vendor.name,
        status: assignment.vendor.status,
      },
    };

    return NextResponse.json<ApiResponse<VendorAssignmentResponse>>({
      success: true,
      data: assignmentResponse,
      message: 'Vendor assigned successfully',
    });
  } catch (error) {
    console.error('Error creating vendor assignment:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to create vendor assignment',
      },
      { status: 500 }
    );
  }
}
