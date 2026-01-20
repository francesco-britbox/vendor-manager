/**
 * Report History API
 *
 * GET /api/reporting/reports/history - Get paginated history of weekly reports for user's assigned vendors
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireViewPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import { getAssignedVendors } from '@/lib/reporting';
import type { ApiResponse } from '@/types';
import type { RAGStatus, ReportStatus, Achievement, FocusItem } from '@/types/delivery-reporting';

// Report history item with vendor info
export interface ReportHistoryItem {
  id: string;
  vendorId: string;
  vendorName: string;
  weekStart: string;
  ragStatus: RAGStatus | null;
  status: ReportStatus;
  submittedAt: string | null;
  achievementCount: number;
  focusItemCount: number;
  createdAt: string;
  updatedAt: string;
}

// Full report details for modal view
export interface ReportHistoryDetail extends Omit<ReportHistoryItem, 'achievementCount' | 'focusItemCount'> {
  achievements: Achievement[];
  focusItems: FocusItem[];
}

// Paginated response
export interface ReportHistoryResponse {
  reports: ReportHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function GET(request: Request) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const vendorIds = searchParams.getAll('vendorId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const status = searchParams.get('status') as ReportStatus | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortBy = searchParams.get('sortBy') || 'weekStart';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Get user's assigned vendors
    const assignedVendors = await getAssignedVendors(userId);

    if (assignedVendors.length === 0) {
      return NextResponse.json<ApiResponse<ReportHistoryResponse>>({
        success: true,
        data: {
          reports: [],
          total: 0,
          page: 1,
          pageSize: limit,
          totalPages: 0,
        },
      });
    }

    const assignedVendorIds = assignedVendors.map((v) => v.id);

    // Build filter conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereConditions: any = {
      // Only show reports for user's assigned vendors
      vendorId: {
        in: vendorIds.length > 0
          ? vendorIds.filter((id) => assignedVendorIds.includes(id))
          : assignedVendorIds,
      },
    };

    // If vendor IDs were specified but none are assigned, return empty
    if (vendorIds.length > 0 && whereConditions.vendorId.in.length === 0) {
      return NextResponse.json<ApiResponse<ReportHistoryResponse>>({
        success: true,
        data: {
          reports: [],
          total: 0,
          page: 1,
          pageSize: limit,
          totalPages: 0,
        },
      });
    }

    // Date range filter
    if (fromDate) {
      whereConditions.weekStart = {
        ...whereConditions.weekStart,
        gte: new Date(fromDate),
      };
    }
    if (toDate) {
      whereConditions.weekStart = {
        ...whereConditions.weekStart,
        lte: new Date(toDate),
      };
    }

    // Status filter
    if (status && ['draft', 'submitted'].includes(status)) {
      whereConditions.status = status;
    }

    // Get total count
    const total = await prisma.weeklyReport.count({
      where: whereConditions,
    });

    // Calculate pagination
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Build sort options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any = { weekStart: 'desc' };
    if (sortBy === 'vendorName') {
      orderBy = { vendor: { name: sortOrder } };
    } else if (sortBy === 'status') {
      orderBy = { status: sortOrder };
    } else if (sortBy === 'submittedAt') {
      orderBy = { submittedAt: sortOrder };
    } else if (sortBy === 'weekStart') {
      orderBy = { weekStart: sortOrder };
    }

    // Fetch reports with vendor info
    const reports = await prisma.weeklyReport.findMany({
      where: whereConditions,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            achievements: true,
            focusItems: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    // Transform to response format
    const reportItems: ReportHistoryItem[] = reports.map((report) => ({
      id: report.id,
      vendorId: report.vendorId,
      vendorName: report.vendor.name,
      weekStart: report.weekStart.toISOString().split('T')[0],
      ragStatus: report.ragStatus as RAGStatus | null,
      status: report.status as ReportStatus,
      submittedAt: report.submittedAt?.toISOString() || null,
      achievementCount: report._count.achievements,
      focusItemCount: report._count.focusItems,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    }));

    return NextResponse.json<ApiResponse<ReportHistoryResponse>>({
      success: true,
      data: {
        reports: reportItems,
        total,
        page,
        pageSize: limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching report history:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch report history',
      },
      { status: 500 }
    );
  }
}
