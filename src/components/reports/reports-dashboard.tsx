'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Building2,
  Users,
  Clock,
  CalendarOff,
  FileCheck,
  FileText,
  Download,
  FileSpreadsheet,
  Eye,
  Loader2,
  Calendar,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import type {
  ReportType,
  ReportFilters,
  Report,
  VendorSpendReport,
  TeamUtilizationReport,
  TimesheetReport,
  TimeOffReport,
  InvoiceValidationReport,
  ContractStatusReport,
  ExportConfig,
} from '@/types/reports';
import { VendorDocumentAnalytics, VendorDocumentExpiryReport } from '@/components/vendor-documents';

import { exportReportToCSV, downloadCSV } from '@/lib/reports/csv-export';
import { exportReportToPDF, downloadPDF } from '@/lib/reports/pdf-export';

// Report type configuration
const REPORT_CONFIGS = [
  {
    id: 'vendor-spend' as ReportType,
    name: 'Vendor Spend',
    description: 'Summary of spend by vendor including invoice status breakdown',
    icon: Building2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'team-utilization' as ReportType,
    name: 'Team Utilization',
    description: 'Team member utilization rates and work statistics',
    icon: Users,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
  {
    id: 'timesheets' as ReportType,
    name: 'Timesheets',
    description: 'Detailed timesheet entries including hours worked and time off',
    icon: Clock,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'time-off' as ReportType,
    name: 'Time Off',
    description: 'Summary of time off taken by team members',
    icon: CalendarOff,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  {
    id: 'invoice-validation' as ReportType,
    name: 'Invoice Validation',
    description: 'Invoice validation status with discrepancy analysis',
    icon: FileCheck,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
  },
  {
    id: 'contract-status' as ReportType,
    name: 'Contract Status',
    description: 'Contract status overview with expiration tracking',
    icon: FileText,
    color: 'text-rose-500',
    bgColor: 'bg-rose-50',
  },
  {
    id: 'document-analytics' as ReportType,
    name: 'Document Analytics',
    description: 'Vendor document analytics with AI analysis status and expiry tracking',
    icon: FileText,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
  },
  {
    id: 'document-expiry' as ReportType,
    name: 'Document Expiry',
    description: 'Document expiration report with renewal deadline tracking',
    icon: CalendarOff,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
  },
];

// Helper to format currency
function formatCurrency(value: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Helper to format number
function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Helper to get status color
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    validated: 'bg-green-100 text-green-800',
    paid: 'bg-blue-100 text-blue-800',
    disputed: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    terminated: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

interface Vendor {
  id: string;
  name: string;
}

export function ReportsDashboard() {
  const { toast } = useToast();

  // State
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [currency, setCurrency] = useState('');

  // Vendor list for filter
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Fetch vendors for filter
  useEffect(() => {
    async function fetchVendors() {
      try {
        const response = await fetch('/api/vendors');
        const data = await response.json();
        if (data.success) {
          setVendors(data.data.vendors || data.data || []);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
      }
    }
    fetchVendors();
  }, []);

  // Quick filter presets
  const setQuickFilter = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(to.toISOString().split('T')[0]);
  };

  const setLastMonth = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(to.toISOString().split('T')[0]);
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(to.toISOString().split('T')[0]);
  };

  const setCurrentYear = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1);
    const to = new Date(now.getFullYear(), 11, 31);
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(to.toISOString().split('T')[0]);
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedVendors([]);
    setSelectedStatus([]);
    setCurrency('');
  };

  const hasFilters = dateFrom || dateTo || selectedVendors.length > 0 || selectedStatus.length > 0 || currency;

  // Generate report
  const generateReport = useCallback(async () => {
    if (!selectedReport) return;

    setIsLoading(true);
    try {
      const filters: ReportFilters = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        vendorIds: selectedVendors.length > 0 ? selectedVendors : undefined,
        status: selectedStatus.length > 0 ? selectedStatus : undefined,
        currency: currency || undefined,
      };

      const response = await fetch(`/api/reports?type=${selectedReport}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      const data = await response.json();
      if (data.success) {
        setReportData(data.data);
        setShowPreview(true);
        toast({
          title: 'Report Generated',
          description: `${REPORT_CONFIGS.find(r => r.id === selectedReport)?.name} report is ready for preview.`,
        });
      } else {
        throw new Error(data.error || 'Failed to generate report');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedReport, dateFrom, dateTo, selectedVendors, selectedStatus, currency, toast]);

  // Export handlers
  const handleExportCSV = useCallback(() => {
    if (!reportData || !selectedReport) return;

    setIsExporting(true);
    try {
      const config: ExportConfig = {
        format: 'csv',
        filename: `${selectedReport}-report-${new Date().toISOString().split('T')[0]}`,
        includeMetadata: true,
        includeSummary: true,
      };

      const csvContent = exportReportToCSV(reportData, selectedReport, config);
      downloadCSV(csvContent, config.filename);

      toast({
        title: 'Export Successful',
        description: 'CSV file has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export CSV',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [reportData, selectedReport, toast]);

  const handleExportPDF = useCallback(() => {
    if (!reportData || !selectedReport) return;

    setIsExporting(true);
    try {
      const config: ExportConfig = {
        format: 'pdf',
        filename: `${selectedReport}-report-${new Date().toISOString().split('T')[0]}`,
        includeMetadata: true,
        includeSummary: true,
      };

      const doc = exportReportToPDF(reportData, selectedReport, config);
      downloadPDF(doc, config.filename);

      toast({
        title: 'Export Successful',
        description: 'PDF file has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [reportData, selectedReport, toast]);

  // Render preview table based on report type
  const renderPreviewTable = () => {
    if (!reportData || !selectedReport) return null;

    switch (selectedReport) {
      case 'vendor-spend':
        return <VendorSpendTable data={reportData as VendorSpendReport} />;
      case 'team-utilization':
        return <TeamUtilizationTable data={reportData as TeamUtilizationReport} />;
      case 'timesheets':
        return <TimesheetTable data={reportData as TimesheetReport} />;
      case 'time-off':
        return <TimeOffTable data={reportData as TimeOffReport} />;
      case 'invoice-validation':
        return <InvoiceValidationTable data={reportData as InvoiceValidationReport} />;
      case 'contract-status':
        return <ContractStatusTable data={reportData as ContractStatusReport} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selection */}
      <div>
        <h3 className="text-lg font-medium mb-4">Select Report Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORT_CONFIGS.map((config) => {
            const Icon = config.icon;
            const isSelected = selectedReport === config.id;
            return (
              <Card
                key={config.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  isSelected && 'ring-2 ring-primary'
                )}
                onClick={() => setSelectedReport(config.id)}
                data-testid={`report-card-${config.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', config.bgColor)}>
                      <Icon className={cn('h-5 w-5', config.color)} />
                    </div>
                    <CardTitle className="text-base">{config.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {config.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Document Analytics - Self-Contained Component */}
      {selectedReport === 'document-analytics' && (
        <VendorDocumentAnalytics />
      )}

      {/* Document Expiry Report - Self-Contained Component */}
      {selectedReport === 'document-expiry' && (
        <VendorDocumentExpiryReport />
      )}

      {/* Filters - Only for traditional reports */}
      {selectedReport && !['document-analytics', 'document-expiry'].includes(selectedReport) && (
        <Card data-testid="report-filters">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Filters</CardTitle>
                {hasFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {[
                      dateFrom || dateTo ? 'Date' : null,
                      selectedVendors.length > 0 ? 'Vendors' : null,
                      selectedStatus.length > 0 ? 'Status' : null,
                      currency ? 'Currency' : null,
                    ].filter(Boolean).join(', ')}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="space-y-4">
              {/* Date Range */}
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Date Range</span>
                </div>
                <div className="flex flex-wrap items-end gap-4 flex-1">
                  <div className="space-y-1">
                    <Label htmlFor="dateFrom" className="text-xs">From</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-[150px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dateTo" className="text-xs">To</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-[150px]"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setQuickFilter(30)} className="text-xs">
                    Last 30 days
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setQuickFilter(90)} className="text-xs">
                    Last 90 days
                  </Button>
                  <Button size="sm" variant="ghost" onClick={setLastMonth} className="text-xs">
                    Last Month
                  </Button>
                  <Button size="sm" variant="ghost" onClick={setCurrentMonth} className="text-xs">
                    This Month
                  </Button>
                  <Button size="sm" variant="ghost" onClick={setCurrentYear} className="text-xs">
                    This Year
                  </Button>
                </div>
              </div>

              {/* Additional Filters Row */}
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Vendor</Label>
                  <Select
                    value={selectedVendors[0] || 'all'}
                    onValueChange={(value) => setSelectedVendors(value === 'all' ? [] : [value])}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All vendors</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Currency</Label>
                  <Select value={currency || 'all'} onValueChange={(value) => setCurrency(value === 'all' ? '' : value)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 ml-auto">
                  {hasFilters && (
                    <Button size="sm" variant="outline" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Clear Filters
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={generateReport}
                    disabled={isLoading}
                    data-testid="generate-report-btn"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedReport && (
                <>
                  {(() => {
                    const config = REPORT_CONFIGS.find(r => r.id === selectedReport);
                    const Icon = config?.icon || FileText;
                    return <Icon className={cn('h-5 w-5', config?.color)} />;
                  })()}
                  {REPORT_CONFIGS.find(r => r.id === selectedReport)?.name} Report
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Preview your report before exporting. Generated at {reportData && 'metadata' in reportData ? new Date((reportData as { metadata: { generatedAt: Date } }).metadata.generatedAt).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>

          {/* Export Buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={isExporting}
              data-testid="export-csv-btn"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={isExporting}
              data-testid="export-pdf-btn"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>

          {/* Report Preview */}
          <div className="border rounded-lg overflow-auto" data-testid="report-preview">
            {renderPreviewTable()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// REPORT TABLE COMPONENTS
// ============================================================================

function VendorSpendTable({ data }: { data: VendorSpendReport }) {
  return (
    <div className="space-y-4 p-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total Spend</p>
          <p className="text-2xl font-bold">{formatCurrency(data.summary.totalSpend, data.summary.currency)}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total Vendors</p>
          <p className="text-2xl font-bold">{data.summary.totalVendors}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold">{formatCurrency(data.summary.byStatus.pending, data.summary.currency)}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Paid</p>
          <p className="text-2xl font-bold">{formatCurrency(data.summary.byStatus.paid, data.summary.currency)}</p>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead>
            <TableHead className="text-right">Total Spend</TableHead>
            <TableHead className="text-right">Invoices</TableHead>
            <TableHead className="text-right">Pending</TableHead>
            <TableHead className="text-right">Validated</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Disputed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((item) => (
            <TableRow key={item.vendorId}>
              <TableCell className="font-medium">{item.vendorName}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.totalSpend, item.currency)}</TableCell>
              <TableCell className="text-right">{item.invoiceCount}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.pendingAmount, item.currency)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.validatedAmount, item.currency)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.paidAmount, item.currency)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.disputedAmount, item.currency)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TeamUtilizationTable({ data }: { data: TeamUtilizationReport }) {
  return (
    <div className="space-y-4 p-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Team Members</p>
          <p className="text-2xl font-bold">{data.summary.totalTeamMembers}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Avg. Utilization</p>
          <p className="text-2xl font-bold">{formatNumber(data.summary.averageUtilization, 1)}%</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Work Days</p>
          <p className="text-2xl font-bold">{data.summary.totalWorkDays}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Time Off Days</p>
          <p className="text-2xl font-bold">{data.summary.totalTimeOffDays}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-bold">{formatCurrency(data.summary.totalCost, data.summary.currency)}</p>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Work Days</TableHead>
            <TableHead className="text-right">Hours</TableHead>
            <TableHead className="text-right">Off Days</TableHead>
            <TableHead className="text-right">Planned %</TableHead>
            <TableHead className="text-right">Actual %</TableHead>
            <TableHead className="text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((item) => (
            <TableRow key={item.teamMemberId}>
              <TableCell className="font-medium">{item.teamMemberName}</TableCell>
              <TableCell>{item.vendorName}</TableCell>
              <TableCell>{item.roleName}</TableCell>
              <TableCell className="text-right">{item.totalWorkDays}</TableCell>
              <TableCell className="text-right">{formatNumber(item.totalHoursWorked, 1)}</TableCell>
              <TableCell className="text-right">{item.totalTimeOffDays}</TableCell>
              <TableCell className="text-right">{item.plannedUtilization ? `${item.plannedUtilization}%` : 'N/A'}</TableCell>
              <TableCell className="text-right">{formatNumber(item.actualUtilization, 1)}%</TableCell>
              <TableCell className="text-right">{formatCurrency(item.totalCost, item.currency)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TimesheetTable({ data }: { data: TimesheetReport }) {
  return (
    <div className="space-y-4 p-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total Entries</p>
          <p className="text-2xl font-bold">{data.summary.totalEntries}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total Hours</p>
          <p className="text-2xl font-bold">{formatNumber(data.summary.totalHours, 1)}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Time Off Days</p>
          <p className="text-2xl font-bold">{data.summary.totalTimeOffDays}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-bold">{formatCurrency(data.summary.totalCost, data.summary.currency)}</p>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Hours</TableHead>
            <TableHead>Time Off</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.slice(0, 100).map((item, index) => (
            <TableRow key={`${item.teamMemberId}-${item.date}-${index}`}>
              <TableCell className="font-medium">{item.teamMemberName}</TableCell>
              <TableCell>{item.vendorName}</TableCell>
              <TableCell>{item.date}</TableCell>
              <TableCell className="text-right">{item.hours ?? '-'}</TableCell>
              <TableCell>
                {item.timeOffCode && (
                  <Badge variant="secondary">{item.timeOffCode}</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(item.dailyRate, item.currency)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.dailyCost, item.currency)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.items.length > 100 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing first 100 of {data.items.length} entries. Export to see all data.
        </p>
      )}
    </div>
  );
}

function TimeOffTable({ data }: { data: TimeOffReport }) {
  return (
    <div className="space-y-4 p-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total Time Off Days</p>
          <p className="text-2xl font-bold">{data.summary.totalTimeOffDays}</p>
        </div>
        {data.summary.byType.slice(0, 3).map((type) => (
          <div key={type.code} className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">{type.description}</p>
            <p className="text-2xl font-bold">{type.count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.slice(0, 100).map((item, index) => (
            <TableRow key={`${item.teamMemberId}-${item.date}-${index}`}>
              <TableCell className="font-medium">{item.teamMemberName}</TableCell>
              <TableCell>{item.email}</TableCell>
              <TableCell>{item.vendorName}</TableCell>
              <TableCell>{item.date}</TableCell>
              <TableCell>
                <Badge variant="secondary">{item.timeOffCode}</Badge>
              </TableCell>
              <TableCell>{item.timeOffDescription}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.items.length > 100 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing first 100 of {data.items.length} entries. Export to see all data.
        </p>
      )}
    </div>
  );
}

function InvoiceValidationTable({ data }: { data: InvoiceValidationReport }) {
  return (
    <div className="space-y-4 p-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total Invoices</p>
          <p className="text-2xl font-bold">{data.summary.totalInvoices}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Invoiced Amount</p>
          <p className="text-2xl font-bold">{formatCurrency(data.summary.totalInvoicedAmount, data.summary.currency)}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Expected Amount</p>
          <p className="text-2xl font-bold">{formatCurrency(data.summary.totalExpectedAmount, data.summary.currency)}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Within Tolerance</p>
          <p className="text-2xl font-bold text-green-600">{data.summary.withinTolerance}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Outside Tolerance</p>
          <p className="text-2xl font-bold text-red-600">{data.summary.outsideTolerance}</p>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Invoiced</TableHead>
            <TableHead className="text-right">Expected</TableHead>
            <TableHead className="text-right">Discrepancy</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>OK?</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((item) => (
            <TableRow key={item.invoiceId}>
              <TableCell className="font-medium">{item.invoiceNumber}</TableCell>
              <TableCell>{item.vendorName}</TableCell>
              <TableCell>{item.invoiceDate}</TableCell>
              <TableCell className="text-sm">{item.billingPeriodStart} to {item.billingPeriodEnd}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.invoicedAmount, item.currency)}</TableCell>
              <TableCell className="text-right">{item.expectedAmount ? formatCurrency(item.expectedAmount, item.currency) : 'N/A'}</TableCell>
              <TableCell className="text-right">{item.discrepancy ? formatCurrency(item.discrepancy, item.currency) : 'N/A'}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
              </TableCell>
              <TableCell>
                {item.isWithinTolerance === null ? (
                  <span className="text-muted-foreground">N/A</span>
                ) : item.isWithinTolerance ? (
                  <Badge className="bg-green-100 text-green-800">Yes</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">No</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ContractStatusTable({ data }: { data: ContractStatusReport }) {
  return (
    <div className="space-y-4 p-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total Contracts</p>
          <p className="text-2xl font-bold">{data.summary.totalContracts}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Total Value</p>
          <p className="text-2xl font-bold">{formatCurrency(data.summary.totalValue, data.summary.currency)}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Expiring 30 days</p>
          <p className="text-2xl font-bold text-orange-600">{data.summary.expiringWithin30Days}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Expiring 60 days</p>
          <p className="text-2xl font-bold text-yellow-600">{data.summary.expiringWithin60Days}</p>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Expiring 90 days</p>
          <p className="text-2xl font-bold">{data.summary.expiringWithin90Days}</p>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead className="text-right">Days Left</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Document</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((item) => (
            <TableRow key={item.contractId}>
              <TableCell className="font-medium">{item.title}</TableCell>
              <TableCell>{item.vendorName}</TableCell>
              <TableCell>{item.startDate}</TableCell>
              <TableCell>{item.endDate}</TableCell>
              <TableCell className={cn(
                'text-right',
                item.daysRemaining <= 30 && item.daysRemaining > 0 && 'text-orange-600 font-medium',
                item.daysRemaining <= 0 && 'text-red-600 font-medium'
              )}>
                {item.daysRemaining}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(item.value, item.currency)}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
              </TableCell>
              <TableCell>
                {item.hasDocument ? (
                  <Badge className="bg-green-100 text-green-800">Yes</Badge>
                ) : (
                  <Badge variant="secondary">No</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
