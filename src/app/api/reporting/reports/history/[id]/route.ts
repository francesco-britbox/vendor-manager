/**
 * Single Report Detail API
 *
 * GET /api/reporting/reports/history/[id] - Get full details of a single report
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireViewPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import { userHasVendorAccess } from '@/lib/reporting';
import type { ApiResponse } from '@/types';
import type { RAGStatus, ReportStatus, Achievement, FocusItem } from '@/types/delivery-reporting';

// Full report detail response
export interface ReportDetailResponse {
  id: string;
  vendorId: string;
  vendorName: string;
  weekStart: string;
  ragStatus: RAGStatus | null;
  status: ReportStatus;
  submittedAt: string | null;
  achievements: Achievement[];
  focusItems: FocusItem[];
  createdAt: string;
  updatedAt: string;
}

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

    const userId = authResult.user.id;
    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User ID not found' },
        { status: 401 }
      );
    }

    // Build auth context for access checks
    const authContext = {
      permissionLevel: authResult.user.permissionLevel,
      isSuperUser: authResult.user.isSuperUser,
    };

    const { id } = await params;

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // Fetch the report with all related data
    const report = await prisma.weeklyReport.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        achievements: {
          orderBy: { sortOrder: 'asc' },
        },
        focusItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!report) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this vendor
    const hasAccess = await userHasVendorAccess(userId, report.vendorId, authContext);
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'You do not have access to this report' },
        { status: 403 }
      );
    }

    // Transform to response format
    const response: ReportDetailResponse = {
      id: report.id,
      vendorId: report.vendorId,
      vendorName: report.vendor.name,
      weekStart: report.weekStart.toISOString().split('T')[0],
      ragStatus: report.ragStatus as RAGStatus | null,
      status: report.status as ReportStatus,
      submittedAt: report.submittedAt?.toISOString() || null,
      achievements: report.achievements.map((a) => ({
        id: a.id,
        description: a.description,
        status: a.status as Achievement['status'],
        isFromFocus: a.isFromFocus,
        sortOrder: a.sortOrder,
      })),
      focusItems: report.focusItems.map((f) => ({
        id: f.id,
        description: f.description,
        isCarriedOver: f.isCarriedOver,
        sortOrder: f.sortOrder,
      })),
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };

    return NextResponse.json<ApiResponse<ReportDetailResponse>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching report detail:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch report detail',
      },
      { status: 500 }
    );
  }
}
