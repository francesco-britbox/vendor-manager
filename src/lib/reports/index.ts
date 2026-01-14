/**
 * Reports Service
 *
 * Provides data generation functions for all report types.
 * Includes vendor spend, team utilization, timesheets, time-off,
 * invoice validation, and contract status reports.
 */

import { prisma } from '@/lib/prisma';
import { Decimal } from 'decimal.js';
import type { InvoiceStatus, ContractStatus } from '@/types';
import type {
  ReportFilters,
  VendorSpendReport,
  VendorSpendItem,
  TeamUtilizationReport,
  TeamUtilizationItem,
  TimesheetReport,
  TimesheetItem,
  TimeOffReport,
  TimeOffItem,
  TimeOffSummaryByType,
  InvoiceValidationReport,
  InvoiceValidationItem,
  ContractStatusReport,
  ContractStatusItem,
} from '@/types/reports';

// Re-export for convenience
export { TIME_OFF_DESCRIPTIONS } from '@/types/reports';

// Helper to convert Decimal to number
function toNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return value.toNumber();
}

// Helper to format date as string
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to calculate working days between dates
function getWorkingDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// ============================================================================
// VENDOR SPEND REPORT
// ============================================================================

export async function generateVendorSpendReport(
  filters: ReportFilters
): Promise<VendorSpendReport> {
  // Build where clause dynamically
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (filters.dateFrom || filters.dateTo) {
    where.invoiceDate = {};
    if (filters.dateFrom) where.invoiceDate.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.invoiceDate.lte = new Date(filters.dateTo);
  }

  if (filters.vendorIds?.length) {
    where.vendorId = { in: filters.vendorIds };
  }

  if (filters.status?.length) {
    where.status = { in: filters.status as InvoiceStatus[] };
  }

  if (filters.currency) {
    where.currency = filters.currency;
  }

  // Get all invoices with vendor details
  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      vendor: {
        select: { id: true, name: true },
      },
    },
  });

  // Group by vendor
  const vendorMap = new Map<string, VendorSpendItem>();

  for (const invoice of invoices) {
    const amount = toNumber(invoice.amount);
    const existing = vendorMap.get(invoice.vendorId) || {
      vendorId: invoice.vendorId,
      vendorName: invoice.vendor.name,
      totalSpend: 0,
      currency: invoice.currency,
      invoiceCount: 0,
      pendingAmount: 0,
      validatedAmount: 0,
      paidAmount: 0,
      disputedAmount: 0,
    };

    existing.totalSpend += amount;
    existing.invoiceCount += 1;

    switch (invoice.status) {
      case 'pending':
        existing.pendingAmount += amount;
        break;
      case 'validated':
        existing.validatedAmount += amount;
        break;
      case 'paid':
        existing.paidAmount += amount;
        break;
      case 'disputed':
        existing.disputedAmount += amount;
        break;
    }

    vendorMap.set(invoice.vendorId, existing);
  }

  const items = Array.from(vendorMap.values()).sort((a, b) => b.totalSpend - a.totalSpend);

  const summary = {
    totalSpend: items.reduce((sum, item) => sum + item.totalSpend, 0),
    totalVendors: items.length,
    currency: filters.currency || 'GBP',
    byStatus: {
      pending: items.reduce((sum, item) => sum + item.pendingAmount, 0),
      validated: items.reduce((sum, item) => sum + item.validatedAmount, 0),
      paid: items.reduce((sum, item) => sum + item.paidAmount, 0),
      disputed: items.reduce((sum, item) => sum + item.disputedAmount, 0),
    },
  };

  return {
    metadata: {
      title: 'Vendor Spend Report',
      description: 'Summary of spend by vendor including invoice status breakdown',
      generatedAt: new Date(),
      filters,
      totalRecords: items.length,
    },
    items,
    summary,
  };
}

// ============================================================================
// TEAM UTILIZATION REPORT
// ============================================================================

export async function generateTeamUtilizationReport(
  filters: ReportFilters
): Promise<TeamUtilizationReport> {
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    status: { in: ['active', 'onboarding'] },
  };

  if (filters.teamMemberIds?.length) {
    where.id = { in: filters.teamMemberIds };
  }

  if (filters.vendorIds?.length) {
    where.vendorId = { in: filters.vendorIds };
  }

  // Get team members with their timesheet entries
  const teamMembers = await prisma.teamMember.findMany({
    where,
    include: {
      vendor: { select: { name: true } },
      role: { select: { name: true } },
      timesheetEntries: {
        where: {
          date: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
      },
    },
  });

  const workingDaysInPeriod = getWorkingDays(dateFrom, dateTo);
  const expectedHoursPerDay = 8;

  const items: TeamUtilizationItem[] = teamMembers.map((member) => {
    const totalHoursWorked = member.timesheetEntries
      .filter((e) => e.hours !== null)
      .reduce((sum, e) => sum + toNumber(e.hours), 0);

    const totalTimeOffDays = member.timesheetEntries.filter(
      (e) => e.timeOffCode !== null
    ).length;

    const totalWorkDays = member.timesheetEntries.filter(
      (e) => e.hours !== null && toNumber(e.hours) > 0
    ).length;

    const expectedHours = (workingDaysInPeriod - totalTimeOffDays) * expectedHoursPerDay;
    const actualUtilization = expectedHours > 0
      ? (totalHoursWorked / expectedHours) * 100
      : 0;

    const dailyRate = toNumber(member.dailyRate);
    const totalCost = totalWorkDays * dailyRate;

    return {
      teamMemberId: member.id,
      teamMemberName: `${member.firstName} ${member.lastName}`,
      email: member.email,
      vendorName: member.vendor.name,
      roleName: member.role.name,
      totalWorkDays,
      totalHoursWorked,
      totalTimeOffDays,
      plannedUtilization: member.plannedUtilization ? toNumber(member.plannedUtilization) : null,
      actualUtilization,
      dailyRate,
      currency: member.currency,
      totalCost,
    };
  });

  const summary = {
    totalTeamMembers: items.length,
    averageUtilization: items.length > 0
      ? items.reduce((sum, item) => sum + item.actualUtilization, 0) / items.length
      : 0,
    totalWorkDays: items.reduce((sum, item) => sum + item.totalWorkDays, 0),
    totalTimeOffDays: items.reduce((sum, item) => sum + item.totalTimeOffDays, 0),
    totalCost: items.reduce((sum, item) => sum + item.totalCost, 0),
    currency: filters.currency || 'GBP',
  };

  return {
    metadata: {
      title: 'Team Utilization Report',
      description: 'Team member utilization rates and work statistics',
      generatedAt: new Date(),
      filters,
      totalRecords: items.length,
    },
    items,
    summary,
  };
}

// ============================================================================
// TIMESHEET REPORT
// ============================================================================

export async function generateTimesheetReport(
  filters: ReportFilters
): Promise<TimesheetReport> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  if (filters.teamMemberIds?.length) {
    where.teamMemberId = { in: filters.teamMemberIds };
  }

  const entries = await prisma.timesheetEntry.findMany({
    where,
    include: {
      teamMember: {
        include: {
          vendor: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { date: 'desc' },
      { teamMemberId: 'asc' },
    ],
  });

  // Apply vendor filter if specified
  const filteredEntries = filters.vendorIds?.length
    ? entries.filter((e) => filters.vendorIds!.includes(e.teamMember.vendorId))
    : entries;

  const items: TimesheetItem[] = filteredEntries.map((entry) => {
    const hours = entry.hours ? toNumber(entry.hours) : null;
    const dailyRate = toNumber(entry.teamMember.dailyRate);
    const dailyCost = hours ? (hours / 8) * dailyRate : 0;

    return {
      teamMemberId: entry.teamMemberId,
      teamMemberName: `${entry.teamMember.firstName} ${entry.teamMember.lastName}`,
      email: entry.teamMember.email,
      vendorName: entry.teamMember.vendor.name,
      date: formatDateString(entry.date),
      hours,
      timeOffCode: entry.timeOffCode,
      dailyRate,
      currency: entry.teamMember.currency,
      dailyCost,
    };
  });

  const summary = {
    totalEntries: items.length,
    totalHours: items.reduce((sum, item) => sum + (item.hours || 0), 0),
    totalTimeOffDays: items.filter((item) => item.timeOffCode !== null).length,
    totalCost: items.reduce((sum, item) => sum + item.dailyCost, 0),
    currency: filters.currency || 'GBP',
  };

  return {
    metadata: {
      title: 'Timesheet Report',
      description: 'Detailed timesheet entries including hours worked and time off',
      generatedAt: new Date(),
      filters,
      totalRecords: items.length,
    },
    items,
    summary,
  };
}

// ============================================================================
// TIME-OFF REPORT
// ============================================================================

export async function generateTimeOffReport(
  filters: ReportFilters
): Promise<TimeOffReport> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    timeOffCode: { not: null },
  };

  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  if (filters.teamMemberIds?.length) {
    where.teamMemberId = { in: filters.teamMemberIds };
  }

  const entries = await prisma.timesheetEntry.findMany({
    where,
    include: {
      teamMember: {
        include: {
          vendor: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { date: 'desc' },
      { teamMemberId: 'asc' },
    ],
  });

  // Apply vendor filter if specified
  const filteredEntries = filters.vendorIds?.length
    ? entries.filter((e) => filters.vendorIds!.includes(e.teamMember.vendorId))
    : entries;

  const TIME_OFF_DESCRIPTIONS: Record<string, string> = {
    VAC: 'Vacation',
    HALF: 'Half Day',
    SICK: 'Sick Leave',
    MAT: 'Maternity Leave',
    CAS: 'Casual Leave',
    UNPAID: 'Unpaid Leave',
  };

  const items: TimeOffItem[] = filteredEntries.map((entry) => ({
    teamMemberId: entry.teamMemberId,
    teamMemberName: `${entry.teamMember.firstName} ${entry.teamMember.lastName}`,
    email: entry.teamMember.email,
    vendorName: entry.teamMember.vendor.name,
    date: formatDateString(entry.date),
    timeOffCode: entry.timeOffCode!,
    timeOffDescription: TIME_OFF_DESCRIPTIONS[entry.timeOffCode!] || entry.timeOffCode!,
  }));

  // Calculate summary by type
  const typeCount = new Map<string, number>();
  items.forEach((item) => {
    typeCount.set(item.timeOffCode, (typeCount.get(item.timeOffCode) || 0) + 1);
  });

  const byType: TimeOffSummaryByType[] = Array.from(typeCount.entries())
    .map(([code, count]) => ({
      code,
      description: TIME_OFF_DESCRIPTIONS[code] || code,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate by team member
  const memberCount = new Map<string, { name: string; count: number }>();
  items.forEach((item) => {
    const existing = memberCount.get(item.teamMemberId) || {
      name: item.teamMemberName,
      count: 0,
    };
    existing.count += 1;
    memberCount.set(item.teamMemberId, existing);
  });

  const byTeamMember = Array.from(memberCount.entries())
    .map(([teamMemberId, data]) => ({
      teamMemberId,
      teamMemberName: data.name,
      totalDays: data.count,
    }))
    .sort((a, b) => b.totalDays - a.totalDays);

  return {
    metadata: {
      title: 'Time Off Report',
      description: 'Summary of time off taken by team members',
      generatedAt: new Date(),
      filters,
      totalRecords: items.length,
    },
    items,
    summary: {
      totalTimeOffDays: items.length,
      byType,
      byTeamMember,
    },
  };
}

// ============================================================================
// INVOICE VALIDATION REPORT
// ============================================================================

export async function generateInvoiceValidationReport(
  filters: ReportFilters
): Promise<InvoiceValidationReport> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (filters.dateFrom || filters.dateTo) {
    where.invoiceDate = {};
    if (filters.dateFrom) where.invoiceDate.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.invoiceDate.lte = new Date(filters.dateTo);
  }

  if (filters.vendorIds?.length) {
    where.vendorId = { in: filters.vendorIds };
  }

  if (filters.status?.length) {
    where.status = { in: filters.status as InvoiceStatus[] };
  }

  if (filters.currency) {
    where.currency = filters.currency;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      vendor: { select: { name: true } },
    },
    orderBy: { invoiceDate: 'desc' },
  });

  const items: InvoiceValidationItem[] = invoices.map((invoice) => {
    const invoicedAmount = toNumber(invoice.amount);
    const expectedAmount = invoice.expectedAmount ? toNumber(invoice.expectedAmount) : null;
    const discrepancy = invoice.discrepancy ? toNumber(invoice.discrepancy) : null;
    const toleranceThreshold = invoice.toleranceThreshold ? toNumber(invoice.toleranceThreshold) : null;

    const discrepancyPercent = expectedAmount && discrepancy
      ? (Math.abs(discrepancy) / expectedAmount) * 100
      : null;

    const isWithinTolerance = toleranceThreshold !== null && discrepancyPercent !== null
      ? discrepancyPercent <= toleranceThreshold
      : null;

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      vendorName: invoice.vendor.name,
      invoiceDate: formatDateString(invoice.invoiceDate),
      billingPeriodStart: formatDateString(invoice.billingPeriodStart),
      billingPeriodEnd: formatDateString(invoice.billingPeriodEnd),
      invoicedAmount,
      expectedAmount,
      discrepancy,
      discrepancyPercent,
      toleranceThreshold,
      status: invoice.status,
      currency: invoice.currency,
      isWithinTolerance,
    };
  });

  const withinTolerance = items.filter((i) => i.isWithinTolerance === true).length;
  const outsideTolerance = items.filter((i) => i.isWithinTolerance === false).length;

  const summary = {
    totalInvoices: items.length,
    totalInvoicedAmount: items.reduce((sum, item) => sum + item.invoicedAmount, 0),
    totalExpectedAmount: items.reduce((sum, item) => sum + (item.expectedAmount || 0), 0),
    totalDiscrepancy: items.reduce((sum, item) => sum + (item.discrepancy || 0), 0),
    currency: filters.currency || 'GBP',
    byStatus: {
      pending: items.filter((i) => i.status === 'pending').length,
      validated: items.filter((i) => i.status === 'validated').length,
      paid: items.filter((i) => i.status === 'paid').length,
      disputed: items.filter((i) => i.status === 'disputed').length,
    },
    withinTolerance,
    outsideTolerance,
  };

  return {
    metadata: {
      title: 'Invoice Validation Report',
      description: 'Invoice validation status with discrepancy analysis',
      generatedAt: new Date(),
      filters,
      totalRecords: items.length,
    },
    items,
    summary,
  };
}

// ============================================================================
// CONTRACT STATUS REPORT
// ============================================================================

export async function generateContractStatusReport(
  filters: ReportFilters
): Promise<ContractStatusReport> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (filters.vendorIds?.length) {
    where.vendorId = { in: filters.vendorIds };
  }

  if (filters.status?.length) {
    where.status = { in: filters.status as ContractStatus[] };
  }

  if (filters.currency) {
    where.currency = filters.currency;
  }

  const contracts = await prisma.contract.findMany({
    where,
    include: {
      vendor: { select: { name: true } },
    },
    orderBy: { endDate: 'asc' },
  });

  const today = new Date();

  const items: ContractStatusItem[] = contracts.map((contract) => {
    const endDate = new Date(contract.endDate);
    const daysRemaining = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      contractId: contract.id,
      title: contract.title,
      vendorName: contract.vendor.name,
      startDate: formatDateString(contract.startDate),
      endDate: formatDateString(contract.endDate),
      daysRemaining,
      value: toNumber(contract.value),
      currency: contract.currency,
      status: contract.status,
      hasDocument: !!contract.documentKey,
    };
  });

  const summary = {
    totalContracts: items.length,
    totalValue: items.reduce((sum, item) => sum + item.value, 0),
    currency: filters.currency || 'GBP',
    byStatus: {
      draft: items.filter((i) => i.status === 'draft').length,
      active: items.filter((i) => i.status === 'active').length,
      expired: items.filter((i) => i.status === 'expired').length,
      terminated: items.filter((i) => i.status === 'terminated').length,
    },
    expiringWithin30Days: items.filter((i) => i.daysRemaining > 0 && i.daysRemaining <= 30).length,
    expiringWithin60Days: items.filter((i) => i.daysRemaining > 0 && i.daysRemaining <= 60).length,
    expiringWithin90Days: items.filter((i) => i.daysRemaining > 0 && i.daysRemaining <= 90).length,
  };

  return {
    metadata: {
      title: 'Contract Status Report',
      description: 'Contract status overview with expiration tracking',
      generatedAt: new Date(),
      filters,
      totalRecords: items.length,
    },
    items,
    summary,
  };
}

// ============================================================================
// REPORT TYPE ROUTER
// ============================================================================

export type ReportGenerator<T> = (filters: ReportFilters) => Promise<T>;

export const reportGenerators: Record<string, ReportGenerator<unknown>> = {
  'vendor-spend': generateVendorSpendReport,
  'team-utilization': generateTeamUtilizationReport,
  'timesheets': generateTimesheetReport,
  'time-off': generateTimeOffReport,
  'invoice-validation': generateInvoiceValidationReport,
  'contract-status': generateContractStatusReport,
};

export async function generateReport(
  reportType: string,
  filters: ReportFilters
): Promise<unknown> {
  const generator = reportGenerators[reportType];
  if (!generator) {
    throw new Error(`Unknown report type: ${reportType}`);
  }
  return generator(filters);
}
