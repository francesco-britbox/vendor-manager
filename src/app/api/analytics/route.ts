/**
 * Analytics API
 *
 * GET /api/analytics - Get comprehensive analytics data (requires view permission)
 *
 * Query parameters:
 * - dateFrom: Start date for filtering (ISO string)
 * - dateTo: End date for filtering (ISO string)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Decimal } from 'decimal.js';
import { getVendorStats } from '@/lib/vendors';
import { getTeamMemberStats } from '@/lib/team-members';
import { getContractStats, getExpiringContracts } from '@/lib/contracts';
import { getInvoiceStats } from '@/lib/invoices';
import {
  requireViewPermission,
  isErrorResponse,
} from '@/lib/api-permissions';
import type { ApiResponse } from '@/types';

// Types for analytics data
export interface SpendByVendor {
  vendorId: string;
  vendorName: string;
  totalSpend: number;
  invoiceCount: number;
}

export interface SpendOverTime {
  month: string;
  year: number;
  totalSpend: number;
  invoiceCount: number;
}

export interface SpendByRole {
  roleId: string;
  roleName: string;
  totalSpend: number;
  memberCount: number;
}

export interface SpendByCurrency {
  currency: string;
  totalSpend: number;
  invoiceCount: number;
}

export interface ExpiringContract {
  id: string;
  title: string;
  vendorName: string;
  endDate: string;
  daysUntilExpiration: number;
  value: number;
  currency: string;
}

export interface AnalyticsData {
  vendorStats: {
    totalVendors: number;
    activeVendors: number;
    inactiveVendors: number;
  };
  teamStats: {
    totalTeamMembers: number;
    activeTeamMembers: number;
    inactiveTeamMembers: number;
    onboardingTeamMembers: number;
    offboardedTeamMembers: number;
  };
  contractStats: {
    totalContracts: number;
    draftContracts: number;
    activeContracts: number;
    expiredContracts: number;
    terminatedContracts: number;
    expiringWithin30Days: number;
    totalValue: number;
  };
  invoiceStats: {
    totalInvoices: number;
    pendingInvoices: number;
    validatedInvoices: number;
    disputedInvoices: number;
    paidInvoices: number;
    totalAmount: number;
    totalExpectedAmount: number;
    invoicesExceedingTolerance: number;
  };
  spendByVendor: SpendByVendor[];
  spendOverTime: SpendOverTime[];
  spendByRole: SpendByRole[];
  spendByCurrency: SpendByCurrency[];
  expiringContracts: ExpiringContract[];
}

export async function GET(request: Request) {
  try {
    // Check view permission
    const authResult = await requireViewPermission();
    if (isErrorResponse(authResult)) {
      return authResult;
    }

    // Parse query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const dateFromStr = searchParams.get('dateFrom');
    const dateToStr = searchParams.get('dateTo');

    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    const dateTo = dateToStr ? new Date(dateToStr) : undefined;

    // Fetch all base stats in parallel
    const [vendorStats, teamStats, contractStats, invoiceStats, expiringContractsData] = await Promise.all([
      getVendorStats(),
      getTeamMemberStats(),
      getContractStats(),
      getInvoiceStats(),
      getExpiringContracts(30),
    ]);

    // Build invoice date filter for analytics
    const invoiceDateFilter: { invoiceDate?: { gte?: Date; lte?: Date } } = {};
    if (dateFrom || dateTo) {
      invoiceDateFilter.invoiceDate = {};
      if (dateFrom) invoiceDateFilter.invoiceDate.gte = dateFrom;
      if (dateTo) invoiceDateFilter.invoiceDate.lte = dateTo;
    }

    // Get spend analytics
    const [spendByVendorData, spendOverTimeData, spendByRoleData, spendByCurrencyData] = await Promise.all([
      // Spend by vendor
      prisma.invoice.groupBy({
        by: ['vendorId'],
        where: invoiceDateFilter,
        _sum: { amount: true },
        _count: { id: true },
      }).then(async (results) => {
        const vendorIds = results.map(r => r.vendorId);
        const vendors = await prisma.vendor.findMany({
          where: { id: { in: vendorIds } },
          select: { id: true, name: true },
        });
        const vendorMap = new Map(vendors.map(v => [v.id, v.name]));

        return results.map(r => ({
          vendorId: r.vendorId,
          vendorName: vendorMap.get(r.vendorId) || 'Unknown',
          totalSpend: r._sum.amount ? (typeof r._sum.amount === 'number' ? r._sum.amount : (r._sum.amount as Decimal).toNumber()) : 0,
          invoiceCount: r._count.id,
        })).sort((a, b) => b.totalSpend - a.totalSpend);
      }),

      // Spend over time (by month)
      prisma.invoice.findMany({
        where: invoiceDateFilter,
        select: { invoiceDate: true, amount: true },
      }).then((invoices) => {
        const monthlySpend = new Map<string, { totalSpend: number; invoiceCount: number }>();

        for (const invoice of invoices) {
          const date = new Date(invoice.invoiceDate);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          const amount = typeof invoice.amount === 'number'
            ? invoice.amount
            : (invoice.amount as Decimal).toNumber();

          const existing = monthlySpend.get(key) || { totalSpend: 0, invoiceCount: 0 };
          existing.totalSpend += amount;
          existing.invoiceCount += 1;
          monthlySpend.set(key, existing);
        }

        return Array.from(monthlySpend.entries())
          .map(([key, data]) => {
            const [year, month] = key.split('-');
            return {
              month: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' }),
              year: parseInt(year),
              totalSpend: Math.round(data.totalSpend * 100) / 100,
              invoiceCount: data.invoiceCount,
            };
          })
          .sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return new Date(`${a.month} 1, ${a.year}`).getTime() - new Date(`${b.month} 1, ${b.year}`).getTime();
          });
      }),

      // Spend by role (via team members)
      prisma.teamMember.findMany({
        where: { status: 'active' },
        select: {
          roleId: true,
          dailyRate: true,
          role: { select: { id: true, name: true } },
        },
      }).then((members) => {
        const roleSpend = new Map<string, { roleName: string; totalSpend: number; memberCount: number }>();

        for (const member of members) {
          const dailyRate = typeof member.dailyRate === 'number'
            ? member.dailyRate
            : (member.dailyRate as Decimal).toNumber();

          // Estimate monthly spend (assuming 20 working days)
          const monthlySpend = dailyRate * 20;

          const existing = roleSpend.get(member.roleId) || {
            roleName: member.role.name,
            totalSpend: 0,
            memberCount: 0
          };
          existing.totalSpend += monthlySpend;
          existing.memberCount += 1;
          roleSpend.set(member.roleId, existing);
        }

        return Array.from(roleSpend.entries())
          .map(([roleId, data]) => ({
            roleId,
            roleName: data.roleName,
            totalSpend: Math.round(data.totalSpend * 100) / 100,
            memberCount: data.memberCount,
          }))
          .sort((a, b) => b.totalSpend - a.totalSpend);
      }),

      // Spend by currency
      prisma.invoice.groupBy({
        by: ['currency'],
        where: invoiceDateFilter,
        _sum: { amount: true },
        _count: { id: true },
      }).then((results) => {
        return results.map(r => ({
          currency: r.currency,
          totalSpend: r._sum.amount ? (typeof r._sum.amount === 'number' ? r._sum.amount : (r._sum.amount as Decimal).toNumber()) : 0,
          invoiceCount: r._count.id,
        })).sort((a, b) => b.totalSpend - a.totalSpend);
      }),
    ]);

    // Transform expiring contracts for response
    const expiringContracts: ExpiringContract[] = expiringContractsData.map(c => ({
      id: c.id,
      title: c.title,
      vendorName: c.vendor.name,
      endDate: c.endDate.toISOString(),
      daysUntilExpiration: c.daysUntilExpiration || 0,
      value: c.value,
      currency: c.currency,
    }));

    const analyticsData: AnalyticsData = {
      vendorStats,
      teamStats,
      contractStats,
      invoiceStats,
      spendByVendor: spendByVendorData,
      spendOverTime: spendOverTimeData,
      spendByRole: spendByRoleData,
      spendByCurrency: spendByCurrencyData,
      expiringContracts,
    };

    return NextResponse.json<ApiResponse<AnalyticsData>>({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}
