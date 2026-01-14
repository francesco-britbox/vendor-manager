// CSV Export utility for reports

import type {
  Report,
  ReportMetadata,
  VendorSpendReport,
  TeamUtilizationReport,
  TimesheetReport,
  TimeOffReport,
  InvoiceValidationReport,
  ContractStatusReport,
  ExportConfig,
} from '@/types/reports';

interface CSVColumn<T> {
  header: string;
  key: keyof T | ((item: T) => string | number | null);
}

function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function arrayToCSV<T>(
  data: T[],
  columns: CSVColumn<T>[]
): string {
  const headerRow = columns.map((col) => escapeCSVField(col.header)).join(',');

  const dataRows = data.map((item) =>
    columns
      .map((col) => {
        const value =
          typeof col.key === 'function'
            ? col.key(item)
            : item[col.key as keyof T];
        return escapeCSVField(value);
      })
      .join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

function generateMetadataSection(metadata: ReportMetadata): string {
  const lines = [
    `Report: ${metadata.title}`,
    `Description: ${metadata.description}`,
    `Generated At: ${formatDate(metadata.generatedAt)}`,
    `Total Records: ${metadata.totalRecords}`,
    '',
    'Filters Applied:',
  ];

  if (metadata.filters.dateFrom) {
    lines.push(`  Date From: ${metadata.filters.dateFrom}`);
  }
  if (metadata.filters.dateTo) {
    lines.push(`  Date To: ${metadata.filters.dateTo}`);
  }
  if (metadata.filters.vendorIds?.length) {
    lines.push(`  Vendors: ${metadata.filters.vendorIds.length} selected`);
  }
  if (metadata.filters.teamMemberIds?.length) {
    lines.push(`  Team Members: ${metadata.filters.teamMemberIds.length} selected`);
  }
  if (metadata.filters.status?.length) {
    lines.push(`  Status: ${metadata.filters.status.join(', ')}`);
  }
  if (metadata.filters.currency) {
    lines.push(`  Currency: ${metadata.filters.currency}`);
  }

  lines.push('');
  return lines.join('\n');
}

// Export functions for each report type

export function exportVendorSpendToCSV(
  report: VendorSpendReport,
  config: ExportConfig
): string {
  const sections: string[] = [];

  if (config.includeMetadata) {
    sections.push(generateMetadataSection(report.metadata));
  }

  if (config.includeSummary) {
    sections.push('Summary');
    sections.push(`Total Spend,${report.summary.totalSpend}`);
    sections.push(`Total Vendors,${report.summary.totalVendors}`);
    sections.push(`Currency,${report.summary.currency}`);
    sections.push(`Pending Amount,${report.summary.byStatus.pending}`);
    sections.push(`Validated Amount,${report.summary.byStatus.validated}`);
    sections.push(`Paid Amount,${report.summary.byStatus.paid}`);
    sections.push(`Disputed Amount,${report.summary.byStatus.disputed}`);
    sections.push('');
  }

  const columns: CSVColumn<VendorSpendReport['items'][0]>[] = [
    { header: 'Vendor Name', key: 'vendorName' },
    { header: 'Total Spend', key: 'totalSpend' },
    { header: 'Currency', key: 'currency' },
    { header: 'Invoice Count', key: 'invoiceCount' },
    { header: 'Pending Amount', key: 'pendingAmount' },
    { header: 'Validated Amount', key: 'validatedAmount' },
    { header: 'Paid Amount', key: 'paidAmount' },
    { header: 'Disputed Amount', key: 'disputedAmount' },
  ];

  sections.push('Data');
  sections.push(arrayToCSV(report.items, columns));

  return sections.join('\n');
}

export function exportTeamUtilizationToCSV(
  report: TeamUtilizationReport,
  config: ExportConfig
): string {
  const sections: string[] = [];

  if (config.includeMetadata) {
    sections.push(generateMetadataSection(report.metadata));
  }

  if (config.includeSummary) {
    sections.push('Summary');
    sections.push(`Total Team Members,${report.summary.totalTeamMembers}`);
    sections.push(`Average Utilization,${report.summary.averageUtilization.toFixed(1)}%`);
    sections.push(`Total Work Days,${report.summary.totalWorkDays}`);
    sections.push(`Total Time Off Days,${report.summary.totalTimeOffDays}`);
    sections.push(`Total Cost,${report.summary.totalCost}`);
    sections.push(`Currency,${report.summary.currency}`);
    sections.push('');
  }

  const columns: CSVColumn<TeamUtilizationReport['items'][0]>[] = [
    { header: 'Team Member', key: 'teamMemberName' },
    { header: 'Email', key: 'email' },
    { header: 'Vendor', key: 'vendorName' },
    { header: 'Role', key: 'roleName' },
    { header: 'Work Days', key: 'totalWorkDays' },
    { header: 'Hours Worked', key: 'totalHoursWorked' },
    { header: 'Time Off Days', key: 'totalTimeOffDays' },
    { header: 'Planned Util. %', key: (item) => item.plannedUtilization ?? 'N/A' },
    { header: 'Actual Util. %', key: (item) => item.actualUtilization.toFixed(1) },
    { header: 'Daily Rate', key: 'dailyRate' },
    { header: 'Currency', key: 'currency' },
    { header: 'Total Cost', key: 'totalCost' },
  ];

  sections.push('Data');
  sections.push(arrayToCSV(report.items, columns));

  return sections.join('\n');
}

export function exportTimesheetToCSV(
  report: TimesheetReport,
  config: ExportConfig
): string {
  const sections: string[] = [];

  if (config.includeMetadata) {
    sections.push(generateMetadataSection(report.metadata));
  }

  if (config.includeSummary) {
    sections.push('Summary');
    sections.push(`Total Entries,${report.summary.totalEntries}`);
    sections.push(`Total Hours,${report.summary.totalHours}`);
    sections.push(`Total Time Off Days,${report.summary.totalTimeOffDays}`);
    sections.push(`Total Cost,${report.summary.totalCost}`);
    sections.push(`Currency,${report.summary.currency}`);
    sections.push('');
  }

  const columns: CSVColumn<TimesheetReport['items'][0]>[] = [
    { header: 'Team Member', key: 'teamMemberName' },
    { header: 'Email', key: 'email' },
    { header: 'Vendor', key: 'vendorName' },
    { header: 'Date', key: 'date' },
    { header: 'Hours', key: (item) => item.hours ?? '' },
    { header: 'Time Off Code', key: (item) => item.timeOffCode ?? '' },
    { header: 'Daily Rate', key: 'dailyRate' },
    { header: 'Currency', key: 'currency' },
    { header: 'Daily Cost', key: 'dailyCost' },
  ];

  sections.push('Data');
  sections.push(arrayToCSV(report.items, columns));

  return sections.join('\n');
}

export function exportTimeOffToCSV(
  report: TimeOffReport,
  config: ExportConfig
): string {
  const sections: string[] = [];

  if (config.includeMetadata) {
    sections.push(generateMetadataSection(report.metadata));
  }

  if (config.includeSummary) {
    sections.push('Summary');
    sections.push(`Total Time Off Days,${report.summary.totalTimeOffDays}`);
    sections.push('');
    sections.push('By Type');
    report.summary.byType.forEach((type) => {
      sections.push(`${type.description},${type.count}`);
    });
    sections.push('');
    sections.push('By Team Member');
    report.summary.byTeamMember.forEach((member) => {
      sections.push(`${member.teamMemberName},${member.totalDays}`);
    });
    sections.push('');
  }

  const columns: CSVColumn<TimeOffReport['items'][0]>[] = [
    { header: 'Team Member', key: 'teamMemberName' },
    { header: 'Email', key: 'email' },
    { header: 'Vendor', key: 'vendorName' },
    { header: 'Date', key: 'date' },
    { header: 'Time Off Code', key: 'timeOffCode' },
    { header: 'Description', key: 'timeOffDescription' },
  ];

  sections.push('Data');
  sections.push(arrayToCSV(report.items, columns));

  return sections.join('\n');
}

export function exportInvoiceValidationToCSV(
  report: InvoiceValidationReport,
  config: ExportConfig
): string {
  const sections: string[] = [];

  if (config.includeMetadata) {
    sections.push(generateMetadataSection(report.metadata));
  }

  if (config.includeSummary) {
    sections.push('Summary');
    sections.push(`Total Invoices,${report.summary.totalInvoices}`);
    sections.push(`Total Invoiced Amount,${report.summary.totalInvoicedAmount}`);
    sections.push(`Total Expected Amount,${report.summary.totalExpectedAmount}`);
    sections.push(`Total Discrepancy,${report.summary.totalDiscrepancy}`);
    sections.push(`Currency,${report.summary.currency}`);
    sections.push(`Within Tolerance,${report.summary.withinTolerance}`);
    sections.push(`Outside Tolerance,${report.summary.outsideTolerance}`);
    sections.push('');
    sections.push('By Status');
    sections.push(`Pending,${report.summary.byStatus.pending}`);
    sections.push(`Validated,${report.summary.byStatus.validated}`);
    sections.push(`Paid,${report.summary.byStatus.paid}`);
    sections.push(`Disputed,${report.summary.byStatus.disputed}`);
    sections.push('');
  }

  const columns: CSVColumn<InvoiceValidationReport['items'][0]>[] = [
    { header: 'Invoice Number', key: 'invoiceNumber' },
    { header: 'Vendor', key: 'vendorName' },
    { header: 'Invoice Date', key: 'invoiceDate' },
    { header: 'Billing Period Start', key: 'billingPeriodStart' },
    { header: 'Billing Period End', key: 'billingPeriodEnd' },
    { header: 'Invoiced Amount', key: 'invoicedAmount' },
    { header: 'Expected Amount', key: (item) => item.expectedAmount ?? '' },
    { header: 'Discrepancy', key: (item) => item.discrepancy ?? '' },
    { header: 'Discrepancy %', key: (item) => item.discrepancyPercent?.toFixed(2) ?? '' },
    { header: 'Tolerance', key: (item) => item.toleranceThreshold ?? '' },
    { header: 'Within Tolerance', key: (item) => item.isWithinTolerance === null ? '' : item.isWithinTolerance ? 'Yes' : 'No' },
    { header: 'Status', key: 'status' },
    { header: 'Currency', key: 'currency' },
  ];

  sections.push('Data');
  sections.push(arrayToCSV(report.items, columns));

  return sections.join('\n');
}

export function exportContractStatusToCSV(
  report: ContractStatusReport,
  config: ExportConfig
): string {
  const sections: string[] = [];

  if (config.includeMetadata) {
    sections.push(generateMetadataSection(report.metadata));
  }

  if (config.includeSummary) {
    sections.push('Summary');
    sections.push(`Total Contracts,${report.summary.totalContracts}`);
    sections.push(`Total Value,${report.summary.totalValue}`);
    sections.push(`Currency,${report.summary.currency}`);
    sections.push(`Expiring within 30 days,${report.summary.expiringWithin30Days}`);
    sections.push(`Expiring within 60 days,${report.summary.expiringWithin60Days}`);
    sections.push(`Expiring within 90 days,${report.summary.expiringWithin90Days}`);
    sections.push('');
    sections.push('By Status');
    sections.push(`Draft,${report.summary.byStatus.draft}`);
    sections.push(`Active,${report.summary.byStatus.active}`);
    sections.push(`Expired,${report.summary.byStatus.expired}`);
    sections.push(`Terminated,${report.summary.byStatus.terminated}`);
    sections.push('');
  }

  const columns: CSVColumn<ContractStatusReport['items'][0]>[] = [
    { header: 'Title', key: 'title' },
    { header: 'Vendor', key: 'vendorName' },
    { header: 'Start Date', key: 'startDate' },
    { header: 'End Date', key: 'endDate' },
    { header: 'Days Remaining', key: 'daysRemaining' },
    { header: 'Value', key: 'value' },
    { header: 'Currency', key: 'currency' },
    { header: 'Status', key: 'status' },
    { header: 'Has Document', key: (item) => item.hasDocument ? 'Yes' : 'No' },
  ];

  sections.push('Data');
  sections.push(arrayToCSV(report.items, columns));

  return sections.join('\n');
}

// Main export function that routes to the correct exporter
export function exportReportToCSV(
  report: Report,
  reportType: string,
  config: ExportConfig
): string {
  switch (reportType) {
    case 'vendor-spend':
      return exportVendorSpendToCSV(report as VendorSpendReport, config);
    case 'team-utilization':
      return exportTeamUtilizationToCSV(report as TeamUtilizationReport, config);
    case 'timesheets':
      return exportTimesheetToCSV(report as TimesheetReport, config);
    case 'time-off':
      return exportTimeOffToCSV(report as TimeOffReport, config);
    case 'invoice-validation':
      return exportInvoiceValidationToCSV(report as InvoiceValidationReport, config);
    case 'contract-status':
      return exportContractStatusToCSV(report as ContractStatusReport, config);
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

// Helper to trigger download in browser
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
