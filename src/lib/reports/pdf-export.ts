// PDF Export utility for reports using jsPDF

import { jsPDF } from 'jspdf';
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

// PDF Styling constants
const COLORS = {
  primary: [59, 130, 246] as [number, number, number],     // Blue
  secondary: [107, 114, 128] as [number, number, number],  // Gray
  success: [34, 197, 94] as [number, number, number],      // Green
  warning: [234, 179, 8] as [number, number, number],      // Yellow
  error: [239, 68, 68] as [number, number, number],        // Red
  text: [31, 41, 55] as [number, number, number],          // Dark gray
  lightGray: [243, 244, 246] as [number, number, number],  // Light gray
  white: [255, 255, 255] as [number, number, number],
};

const FONTS = {
  title: 18,
  subtitle: 14,
  header: 11,
  body: 10,
  small: 8,
};

const MARGINS = {
  left: 20,
  right: 20,
  top: 20,
  bottom: 20,
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatCurrency(value: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Helper to add page with header
function addPageWithHeader(doc: jsPDF, title: string, pageNumber: number): number {
  if (pageNumber > 1) {
    doc.addPage();
  }

  // Header background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 40, 'F');

  // Title
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(FONTS.title);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGINS.left, 26);

  // Page number
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Page ${pageNumber}`,
    doc.internal.pageSize.getWidth() - MARGINS.right,
    26,
    { align: 'right' }
  );

  return 55; // Return Y position after header
}

// Helper to add metadata section
function addMetadataSection(doc: jsPDF, metadata: ReportMetadata, y: number): number {
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(FONTS.body);
  doc.setFont('helvetica', 'normal');

  const lineHeight = 6;

  doc.text(`Generated: ${formatDate(metadata.generatedAt)}`, MARGINS.left, y);
  y += lineHeight;

  doc.text(`Total Records: ${metadata.totalRecords}`, MARGINS.left, y);
  y += lineHeight;

  // Filters
  const filters: string[] = [];
  if (metadata.filters.dateFrom) filters.push(`From: ${metadata.filters.dateFrom}`);
  if (metadata.filters.dateTo) filters.push(`To: ${metadata.filters.dateTo}`);
  if (metadata.filters.currency) filters.push(`Currency: ${metadata.filters.currency}`);

  if (filters.length > 0) {
    doc.text(`Filters: ${filters.join(' | ')}`, MARGINS.left, y);
    y += lineHeight;
  }

  return y + 5;
}

// Helper to add summary card
function addSummaryCard(
  doc: jsPDF,
  title: string,
  value: string,
  x: number,
  y: number,
  width: number = 50
): void {
  // Card background
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(x, y, width, 25, 3, 3, 'F');

  // Title
  doc.setTextColor(...COLORS.secondary);
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'normal');
  doc.text(title, x + 5, y + 8);

  // Value
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(FONTS.header);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + 5, y + 18);
}

// Helper to add table
function addTable(
  doc: jsPDF,
  headers: string[],
  rows: (string | number)[][],
  y: number,
  columnWidths: number[]
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableWidth = pageWidth - MARGINS.left - MARGINS.right;
  const rowHeight = 8;
  const headerHeight = 10;

  // Normalize column widths to fit table width
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
  const normalizedWidths = columnWidths.map((w) => (w / totalWidth) * tableWidth);

  // Table header
  doc.setFillColor(...COLORS.primary);
  doc.rect(MARGINS.left, y, tableWidth, headerHeight, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(FONTS.small);
  doc.setFont('helvetica', 'bold');

  let x = MARGINS.left;
  headers.forEach((header, i) => {
    doc.text(header, x + 2, y + 6.5, { maxWidth: normalizedWidths[i] - 4 });
    x += normalizedWidths[i];
  });

  y += headerHeight;

  // Table rows
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');

  rows.forEach((row, rowIndex) => {
    // Check if we need a new page
    if (y + rowHeight > pageHeight - MARGINS.bottom) {
      doc.addPage();
      y = MARGINS.top + 10;

      // Re-add header on new page
      doc.setFillColor(...COLORS.primary);
      doc.rect(MARGINS.left, y, tableWidth, headerHeight, 'F');

      doc.setTextColor(...COLORS.white);
      doc.setFont('helvetica', 'bold');

      let xPos = MARGINS.left;
      headers.forEach((header, i) => {
        doc.text(header, xPos + 2, y + 6.5, { maxWidth: normalizedWidths[i] - 4 });
        xPos += normalizedWidths[i];
      });

      y += headerHeight;
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'normal');
    }

    // Alternate row background
    if (rowIndex % 2 === 0) {
      doc.setFillColor(...COLORS.lightGray);
      doc.rect(MARGINS.left, y, tableWidth, rowHeight, 'F');
    }

    x = MARGINS.left;
    row.forEach((cell, i) => {
      const cellText = String(cell ?? '');
      doc.text(cellText, x + 2, y + 5.5, { maxWidth: normalizedWidths[i] - 4 });
      x += normalizedWidths[i];
    });

    y += rowHeight;
  });

  return y + 5;
}

// Export functions for each report type

export function exportVendorSpendToPDF(
  report: VendorSpendReport,
  config: ExportConfig
): jsPDF {
  const doc = new jsPDF();
  let y = addPageWithHeader(doc, 'Vendor Spend Report', 1);

  if (config.includeMetadata) {
    y = addMetadataSection(doc, report.metadata, y);
  }

  if (config.includeSummary) {
    // Summary cards
    addSummaryCard(doc, 'Total Spend', formatCurrency(report.summary.totalSpend, report.summary.currency), MARGINS.left, y, 55);
    addSummaryCard(doc, 'Vendors', String(report.summary.totalVendors), MARGINS.left + 60, y, 40);
    addSummaryCard(doc, 'Pending', formatCurrency(report.summary.byStatus.pending, report.summary.currency), MARGINS.left + 105, y, 45);
    addSummaryCard(doc, 'Validated', formatCurrency(report.summary.byStatus.validated, report.summary.currency), MARGINS.left + 155, y, 45);
    y += 35;
  }

  // Data table
  const headers = ['Vendor', 'Total Spend', 'Invoices', 'Pending', 'Validated', 'Paid', 'Disputed'];
  const rows = report.items.map((item) => [
    item.vendorName,
    formatCurrency(item.totalSpend, item.currency),
    item.invoiceCount,
    formatCurrency(item.pendingAmount, item.currency),
    formatCurrency(item.validatedAmount, item.currency),
    formatCurrency(item.paidAmount, item.currency),
    formatCurrency(item.disputedAmount, item.currency),
  ]);

  addTable(doc, headers, rows, y, [30, 15, 10, 15, 15, 15, 15]);

  return doc;
}

export function exportTeamUtilizationToPDF(
  report: TeamUtilizationReport,
  config: ExportConfig
): jsPDF {
  const doc = new jsPDF('landscape');
  let y = addPageWithHeader(doc, 'Team Utilization Report', 1);

  if (config.includeMetadata) {
    y = addMetadataSection(doc, report.metadata, y);
  }

  if (config.includeSummary) {
    addSummaryCard(doc, 'Team Members', String(report.summary.totalTeamMembers), MARGINS.left, y, 50);
    addSummaryCard(doc, 'Avg. Utilization', `${report.summary.averageUtilization.toFixed(1)}%`, MARGINS.left + 55, y, 50);
    addSummaryCard(doc, 'Work Days', String(report.summary.totalWorkDays), MARGINS.left + 110, y, 45);
    addSummaryCard(doc, 'Time Off Days', String(report.summary.totalTimeOffDays), MARGINS.left + 160, y, 45);
    addSummaryCard(doc, 'Total Cost', formatCurrency(report.summary.totalCost, report.summary.currency), MARGINS.left + 210, y, 55);
    y += 35;
  }

  const headers = ['Name', 'Vendor', 'Role', 'Work Days', 'Hours', 'Off Days', 'Plan %', 'Actual %', 'Rate', 'Cost'];
  const rows = report.items.map((item) => [
    item.teamMemberName,
    item.vendorName.substring(0, 15),
    item.roleName.substring(0, 12),
    item.totalWorkDays,
    item.totalHoursWorked,
    item.totalTimeOffDays,
    item.plannedUtilization ? `${item.plannedUtilization}%` : 'N/A',
    `${item.actualUtilization.toFixed(1)}%`,
    formatCurrency(item.dailyRate, item.currency),
    formatCurrency(item.totalCost, item.currency),
  ]);

  addTable(doc, headers, rows, y, [20, 15, 12, 10, 8, 8, 8, 10, 12, 12]);

  return doc;
}

export function exportTimesheetToPDF(
  report: TimesheetReport,
  config: ExportConfig
): jsPDF {
  const doc = new jsPDF();
  let y = addPageWithHeader(doc, 'Timesheet Report', 1);

  if (config.includeMetadata) {
    y = addMetadataSection(doc, report.metadata, y);
  }

  if (config.includeSummary) {
    addSummaryCard(doc, 'Total Entries', String(report.summary.totalEntries), MARGINS.left, y, 50);
    addSummaryCard(doc, 'Total Hours', formatNumber(report.summary.totalHours, 1), MARGINS.left + 55, y, 45);
    addSummaryCard(doc, 'Time Off Days', String(report.summary.totalTimeOffDays), MARGINS.left + 105, y, 45);
    addSummaryCard(doc, 'Total Cost', formatCurrency(report.summary.totalCost, report.summary.currency), MARGINS.left + 155, y, 50);
    y += 35;
  }

  const headers = ['Name', 'Vendor', 'Date', 'Hours', 'Time Off', 'Rate', 'Cost'];
  const rows = report.items.map((item) => [
    item.teamMemberName,
    item.vendorName.substring(0, 15),
    item.date,
    item.hours ?? '',
    item.timeOffCode ?? '',
    formatCurrency(item.dailyRate, item.currency),
    formatCurrency(item.dailyCost, item.currency),
  ]);

  addTable(doc, headers, rows, y, [25, 20, 15, 10, 10, 15, 15]);

  return doc;
}

export function exportTimeOffToPDF(
  report: TimeOffReport,
  config: ExportConfig
): jsPDF {
  const doc = new jsPDF();
  let y = addPageWithHeader(doc, 'Time Off Report', 1);

  if (config.includeMetadata) {
    y = addMetadataSection(doc, report.metadata, y);
  }

  if (config.includeSummary) {
    addSummaryCard(doc, 'Total Days Off', String(report.summary.totalTimeOffDays), MARGINS.left, y, 50);

    // By type summary
    let xOffset = 55;
    report.summary.byType.slice(0, 4).forEach((type) => {
      addSummaryCard(doc, type.description, String(type.count), MARGINS.left + xOffset, y, 40);
      xOffset += 45;
    });
    y += 35;
  }

  const headers = ['Name', 'Email', 'Vendor', 'Date', 'Code', 'Description'];
  const rows = report.items.map((item) => [
    item.teamMemberName,
    item.email.substring(0, 20),
    item.vendorName.substring(0, 15),
    item.date,
    item.timeOffCode,
    item.timeOffDescription,
  ]);

  addTable(doc, headers, rows, y, [20, 25, 18, 15, 8, 20]);

  return doc;
}

export function exportInvoiceValidationToPDF(
  report: InvoiceValidationReport,
  config: ExportConfig
): jsPDF {
  const doc = new jsPDF('landscape');
  let y = addPageWithHeader(doc, 'Invoice Validation Report', 1);

  if (config.includeMetadata) {
    y = addMetadataSection(doc, report.metadata, y);
  }

  if (config.includeSummary) {
    addSummaryCard(doc, 'Total Invoices', String(report.summary.totalInvoices), MARGINS.left, y, 45);
    addSummaryCard(doc, 'Invoiced', formatCurrency(report.summary.totalInvoicedAmount, report.summary.currency), MARGINS.left + 50, y, 50);
    addSummaryCard(doc, 'Expected', formatCurrency(report.summary.totalExpectedAmount, report.summary.currency), MARGINS.left + 105, y, 50);
    addSummaryCard(doc, 'Discrepancy', formatCurrency(report.summary.totalDiscrepancy, report.summary.currency), MARGINS.left + 160, y, 50);
    addSummaryCard(doc, 'In Tolerance', String(report.summary.withinTolerance), MARGINS.left + 215, y, 40);
    y += 35;
  }

  const headers = ['Invoice #', 'Vendor', 'Date', 'Period', 'Invoiced', 'Expected', 'Discr.', 'Discr. %', 'Status', 'OK?'];
  const rows = report.items.map((item) => [
    item.invoiceNumber,
    item.vendorName.substring(0, 12),
    item.invoiceDate,
    `${item.billingPeriodStart.substring(5)} - ${item.billingPeriodEnd.substring(5)}`,
    formatCurrency(item.invoicedAmount, item.currency),
    item.expectedAmount ? formatCurrency(item.expectedAmount, item.currency) : 'N/A',
    item.discrepancy ? formatCurrency(item.discrepancy, item.currency) : 'N/A',
    item.discrepancyPercent ? `${item.discrepancyPercent.toFixed(1)}%` : 'N/A',
    item.status,
    item.isWithinTolerance === null ? 'N/A' : item.isWithinTolerance ? 'Yes' : 'No',
  ]);

  addTable(doc, headers, rows, y, [12, 12, 10, 18, 12, 12, 10, 8, 10, 6]);

  return doc;
}

export function exportContractStatusToPDF(
  report: ContractStatusReport,
  config: ExportConfig
): jsPDF {
  const doc = new jsPDF('landscape');
  let y = addPageWithHeader(doc, 'Contract Status Report', 1);

  if (config.includeMetadata) {
    y = addMetadataSection(doc, report.metadata, y);
  }

  if (config.includeSummary) {
    addSummaryCard(doc, 'Total Contracts', String(report.summary.totalContracts), MARGINS.left, y, 50);
    addSummaryCard(doc, 'Total Value', formatCurrency(report.summary.totalValue, report.summary.currency), MARGINS.left + 55, y, 55);
    addSummaryCard(doc, 'Exp. 30 days', String(report.summary.expiringWithin30Days), MARGINS.left + 115, y, 45);
    addSummaryCard(doc, 'Exp. 60 days', String(report.summary.expiringWithin60Days), MARGINS.left + 165, y, 45);
    addSummaryCard(doc, 'Exp. 90 days', String(report.summary.expiringWithin90Days), MARGINS.left + 215, y, 45);
    y += 35;
  }

  const headers = ['Title', 'Vendor', 'Start Date', 'End Date', 'Days Left', 'Value', 'Status', 'Doc?'];
  const rows = report.items.map((item) => [
    item.title.substring(0, 25),
    item.vendorName.substring(0, 15),
    item.startDate,
    item.endDate,
    item.daysRemaining,
    formatCurrency(item.value, item.currency),
    item.status,
    item.hasDocument ? 'Yes' : 'No',
  ]);

  addTable(doc, headers, rows, y, [25, 18, 12, 12, 10, 15, 10, 6]);

  return doc;
}

// Main export function that routes to the correct exporter
export function exportReportToPDF(
  report: Report,
  reportType: string,
  config: ExportConfig
): jsPDF {
  switch (reportType) {
    case 'vendor-spend':
      return exportVendorSpendToPDF(report as VendorSpendReport, config);
    case 'team-utilization':
      return exportTeamUtilizationToPDF(report as TeamUtilizationReport, config);
    case 'timesheets':
      return exportTimesheetToPDF(report as TimesheetReport, config);
    case 'time-off':
      return exportTimeOffToPDF(report as TimeOffReport, config);
    case 'invoice-validation':
      return exportInvoiceValidationToPDF(report as InvoiceValidationReport, config);
    case 'contract-status':
      return exportContractStatusToPDF(report as ContractStatusReport, config);
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

// Helper to trigger download in browser
export function downloadPDF(doc: jsPDF, filename: string): void {
  const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(finalFilename);
}
