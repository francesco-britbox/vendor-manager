/**
 * Analytics API
 *
 * GET /api/analytics - Get comprehensive analytics data (requires view permission)
 *
 * Query parameters:
 * - dateFrom: Start date for filtering (ISO string)
 * - dateTo: End date for filtering (ISO string)
 * - vendorId: Filter by specific vendor ID (optional)
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

    // Parse query parameters for date and vendor filtering
    const { searchParams } = new URL(request.url);
    const dateFromStr = searchParams.get('dateFrom');
    const dateToStr = searchParams.get('dateTo');
    const vendorIdStr = searchParams.get('vendorId');

    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    const dateTo = dateToStr ? new Date(dateToStr) : undefined;
    const vendorId = vendorIdStr || undefined;

    // Fetch stats - if vendor is filtered, compute vendor-specific stats
    // Otherwise, use the global stats functions
    let vendorStats;
    let teamStats;
    let contractStats;
    let invoiceStats;
    let expiringContractsData;

    if (vendorId) {
      // Vendor-filtered stats - compute inline
      const [
        vendorData,
        teamMembers,
        contracts,
        invoices,
        expiringContracts,
      ] = await Promise.all([
        // Vendor info
        prisma.vendor.findUnique({
          where: { id: vendorId },
          select: { id: true, status: true },
        }),
        // Team members for this vendor
        prisma.teamMember.groupBy({
          by: ['status'],
          where: { vendorId },
          _count: { id: true },
        }),
        // Contracts for this vendor
        prisma.contract.findMany({
          where: { vendorId },
          select: { status: true, value: true, endDate: true },
        }),
        // Invoices for this vendor (with date filter)
        prisma.invoice.findMany({
          where: {
            vendorId,
            ...(dateFrom || dateTo ? {
              invoiceDate: {
                ...(dateFrom && { gte: dateFrom }),
                ...(dateTo && { lte: dateTo }),
              },
            } : {}),
          },
          select: {
            status: true,
            amount: true,
            expectedAmount: true,
            toleranceThreshold: true,
          },
        }),
        // Expiring contracts for this vendor
        prisma.contract.findMany({
          where: {
            vendorId,
            status: 'active',
            endDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
          include: {
            vendor: { select: { name: true } },
          },
        }),
      ]);

      // Process vendor stats
      vendorStats = {
        totalVendors: vendorData ? 1 : 0,
        activeVendors: vendorData?.status === 'active' ? 1 : 0,
        inactiveVendors: vendorData?.status === 'inactive' ? 1 : 0,
      };

      // Process team stats
      const teamStatusMap = new Map(teamMembers.map(t => [t.status, t._count.id]));
      teamStats = {
        totalTeamMembers: teamMembers.reduce((sum, t) => sum + t._count.id, 0),
        activeTeamMembers: teamStatusMap.get('active') || 0,
        inactiveTeamMembers: teamStatusMap.get('inactive') || 0,
        onboardingTeamMembers: teamStatusMap.get('onboarding') || 0,
        offboardedTeamMembers: teamStatusMap.get('offboarded') || 0,
      };

      // Process contract stats
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      let totalContractValue = 0;
      let expiringWithin30Days = 0;

      const contractStatusCounts = { draft: 0, active: 0, expired: 0, terminated: 0 };
      for (const contract of contracts) {
        if (contract.status in contractStatusCounts) {
          contractStatusCounts[contract.status as keyof typeof contractStatusCounts]++;
        }
        const value = typeof contract.value === 'number' ? contract.value : (contract.value as Decimal).toNumber();
        totalContractValue += value;
        if (contract.status === 'active' && contract.endDate && contract.endDate <= thirtyDaysFromNow && contract.endDate >= now) {
          expiringWithin30Days++;
        }
      }

      contractStats = {
        totalContracts: contracts.length,
        draftContracts: contractStatusCounts.draft,
        activeContracts: contractStatusCounts.active,
        expiredContracts: contractStatusCounts.expired,
        terminatedContracts: contractStatusCounts.terminated,
        expiringWithin30Days,
        totalValue: totalContractValue,
      };

      // Process invoice stats
      let totalAmount = 0;
      let totalExpectedAmount = 0;
      let invoicesExceedingTolerance = 0;
      const invoiceStatusCounts = { pending: 0, validated: 0, disputed: 0, paid: 0 };

      for (const invoice of invoices) {
        if (invoice.status in invoiceStatusCounts) {
          invoiceStatusCounts[invoice.status as keyof typeof invoiceStatusCounts]++;
        }
        const amount = typeof invoice.amount === 'number' ? invoice.amount : (invoice.amount as Decimal).toNumber();
        totalAmount += amount;

        if (invoice.expectedAmount) {
          const expected = typeof invoice.expectedAmount === 'number' ? invoice.expectedAmount : (invoice.expectedAmount as Decimal).toNumber();
          totalExpectedAmount += expected;

          const tolerance = invoice.toleranceThreshold
            ? (typeof invoice.toleranceThreshold === 'number' ? invoice.toleranceThreshold : (invoice.toleranceThreshold as Decimal).toNumber())
            : 5;

          const discrepancyPercent = expected > 0 ? Math.abs((amount - expected) / expected) * 100 : 0;
          if (discrepancyPercent > tolerance) {
            invoicesExceedingTolerance++;
          }
        }
      }

      invoiceStats = {
        totalInvoices: invoices.length,
        pendingInvoices: invoiceStatusCounts.pending,
        validatedInvoices: invoiceStatusCounts.validated,
        disputedInvoices: invoiceStatusCounts.disputed,
        paidInvoices: invoiceStatusCounts.paid,
        totalAmount,
        totalExpectedAmount,
        invoicesExceedingTolerance,
      };

      // Process expiring contracts
      expiringContractsData = expiringContracts.map(c => ({
        id: c.id,
        title: c.title,
        vendor: { name: c.vendor.name },
        endDate: c.endDate,
        daysUntilExpiration: Math.ceil((c.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
        value: typeof c.value === 'number' ? c.value : (c.value as Decimal).toNumber(),
        currency: c.currency,
      }));
    } else {
      // No vendor filter - use global stats functions
      [vendorStats, teamStats, contractStats, invoiceStats, expiringContractsData] = await Promise.all([
        getVendorStats(),
        getTeamMemberStats(),
        getContractStats(),
        getInvoiceStats(),
        getExpiringContracts(30),
      ]);
    }

    // Build invoice filter for analytics (date + vendor)
    const invoiceFilter: {
      invoiceDate?: { gte?: Date; lte?: Date };
      vendorId?: string;
    } = {};
    if (dateFrom || dateTo) {
      invoiceFilter.invoiceDate = {};
      if (dateFrom) invoiceFilter.invoiceDate.gte = dateFrom;
      if (dateTo) invoiceFilter.invoiceDate.lte = dateTo;
    }
    if (vendorId) {
      invoiceFilter.vendorId = vendorId;
    }

    // Build team member filter for vendor
    const teamMemberFilter: {
      status: 'active';
      vendorId?: string;
    } = { status: 'active' };
    if (vendorId) {
      teamMemberFilter.vendorId = vendorId;
    }

    // Build contract filter for vendor
    const contractFilter: {
      vendorId?: string;
    } = {};
    if (vendorId) {
      contractFilter.vendorId = vendorId;
    }

    // Get spend analytics
    const [spendByVendorData, spendOverTimeData, spendByRoleData, spendByCurrencyData] = await Promise.all([
      // Spend by vendor
      prisma.invoice.groupBy({
        by: ['vendorId'],
        where: invoiceFilter,
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
        where: invoiceFilter,
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

      // Spend by role (via team members) - filtered by vendor if specified
      prisma.teamMember.findMany({
        where: teamMemberFilter,
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
        where: invoiceFilter,
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
      endDate: c.endDate instanceof Date ? c.endDate.toISOString() : String(c.endDate),
      daysUntilExpiration: c.daysUntilExpiration || 0,
      value: typeof c.value === 'number' ? c.value : Number(c.value),
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
