// Report types and interfaces for the reporting framework

export type ReportType =
  | 'vendor-spend'
  | 'team-utilization'
  | 'timesheets'
  | 'time-off'
  | 'invoice-validation'
  | 'contract-status'
  | 'document-analytics'
  | 'document-expiry';

export type ExportFormat = 'csv' | 'pdf';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  vendorIds?: string[];
  teamMemberIds?: string[];
  status?: string[];
  currency?: string;
}

export interface ReportMetadata {
  title: string;
  description: string;
  generatedAt: Date;
  filters: ReportFilters;
  totalRecords: number;
}

// Vendor Spend Report
export interface VendorSpendItem {
  vendorId: string;
  vendorName: string;
  totalSpend: number;
  currency: string;
  invoiceCount: number;
  pendingAmount: number;
  validatedAmount: number;
  paidAmount: number;
  disputedAmount: number;
}

export interface VendorSpendReport {
  metadata: ReportMetadata;
  items: VendorSpendItem[];
  summary: {
    totalSpend: number;
    totalVendors: number;
    currency: string;
    byStatus: {
      pending: number;
      validated: number;
      paid: number;
      disputed: number;
    };
  };
}

// Team Utilization Report
export interface TeamUtilizationItem {
  teamMemberId: string;
  teamMemberName: string;
  email: string;
  vendorName: string;
  roleName: string;
  totalWorkDays: number;
  totalHoursWorked: number;
  totalTimeOffDays: number;
  plannedUtilization: number | null;
  actualUtilization: number;
  dailyRate: number;
  currency: string;
  totalCost: number;
}

export interface TeamUtilizationReport {
  metadata: ReportMetadata;
  items: TeamUtilizationItem[];
  summary: {
    totalTeamMembers: number;
    averageUtilization: number;
    totalWorkDays: number;
    totalTimeOffDays: number;
    totalCost: number;
    currency: string;
  };
}

// Timesheet Report
export interface TimesheetItem {
  teamMemberId: string;
  teamMemberName: string;
  email: string;
  vendorName: string;
  date: string;
  hours: number | null;
  timeOffCode: string | null;
  dailyRate: number;
  currency: string;
  dailyCost: number;
}

export interface TimesheetReport {
  metadata: ReportMetadata;
  items: TimesheetItem[];
  summary: {
    totalEntries: number;
    totalHours: number;
    totalTimeOffDays: number;
    totalCost: number;
    currency: string;
  };
}

// Time-Off Report
export interface TimeOffItem {
  teamMemberId: string;
  teamMemberName: string;
  email: string;
  vendorName: string;
  date: string;
  timeOffCode: string;
  timeOffDescription: string;
}

export interface TimeOffSummaryByType {
  code: string;
  description: string;
  count: number;
}

export interface TimeOffReport {
  metadata: ReportMetadata;
  items: TimeOffItem[];
  summary: {
    totalTimeOffDays: number;
    byType: TimeOffSummaryByType[];
    byTeamMember: {
      teamMemberId: string;
      teamMemberName: string;
      totalDays: number;
    }[];
  };
}

// Invoice Validation Report
export interface InvoiceValidationItem {
  invoiceId: string;
  invoiceNumber: string;
  vendorName: string;
  invoiceDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  invoicedAmount: number;
  expectedAmount: number | null;
  discrepancy: number | null;
  discrepancyPercent: number | null;
  toleranceThreshold: number | null;
  status: string;
  currency: string;
  isWithinTolerance: boolean | null;
}

export interface InvoiceValidationReport {
  metadata: ReportMetadata;
  items: InvoiceValidationItem[];
  summary: {
    totalInvoices: number;
    totalInvoicedAmount: number;
    totalExpectedAmount: number;
    totalDiscrepancy: number;
    currency: string;
    byStatus: {
      pending: number;
      validated: number;
      paid: number;
      disputed: number;
    };
    withinTolerance: number;
    outsideTolerance: number;
  };
}

// Contract Status Report
export interface ContractStatusItem {
  contractId: string;
  title: string;
  vendorName: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  value: number;
  currency: string;
  status: string;
  hasDocument: boolean;
}

export interface ContractStatusReport {
  metadata: ReportMetadata;
  items: ContractStatusItem[];
  summary: {
    totalContracts: number;
    totalValue: number;
    currency: string;
    byStatus: {
      draft: number;
      active: number;
      expired: number;
      terminated: number;
    };
    expiringWithin30Days: number;
    expiringWithin60Days: number;
    expiringWithin90Days: number;
  };
}

// Union type for all reports
export type Report =
  | VendorSpendReport
  | TeamUtilizationReport
  | TimesheetReport
  | TimeOffReport
  | InvoiceValidationReport
  | ContractStatusReport;

// Export configuration
export interface ExportConfig {
  format: ExportFormat;
  filename: string;
  includeMetadata: boolean;
  includeSummary: boolean;
}

// Time off code descriptions
export const TIME_OFF_DESCRIPTIONS: Record<string, string> = {
  VAC: 'Vacation',
  HALF: 'Half Day',
  SICK: 'Sick Leave',
  MAT: 'Maternity Leave',
  CAS: 'Casual Leave',
  UNPAID: 'Unpaid Leave',
};
