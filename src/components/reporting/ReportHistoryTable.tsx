'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Clock,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Calendar,
  X,
  Loader2,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { ReportDetailModal } from './ReportDetailModal';
import type { RAGStatus, ReportStatus, AssignedVendor } from '@/types/delivery-reporting';

// Report history item type (matching API response)
interface ReportHistoryItem {
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

interface ReportHistoryResponse {
  reports: ReportHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ReportHistoryTableProps {
  initialVendors?: AssignedVendor[];
}

// Format date as "20 Jan 2026"
function formatWeekDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Format submission date
function formatSubmittedDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// RAG Status Badge component
function RAGStatusBadge({ status }: { status: RAGStatus | null }) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-gray-500 border-gray-300">
        Not Set
      </Badge>
    );
  }

  const variants: Record<RAGStatus, { className: string; label: string }> = {
    green: { className: 'bg-green-100 text-green-800 border-green-300', label: 'Green' },
    amber: { className: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Amber' },
    red: { className: 'bg-red-100 text-red-800 border-red-300', label: 'Red' },
  };

  const variant = variants[status];
  return (
    <Badge variant="outline" className={variant.className}>
      {variant.label}
    </Badge>
  );
}

// Report Status Badge component
function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const variants: Record<ReportStatus, { className: string; label: string }> = {
    draft: { className: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Draft' },
    submitted: { className: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Submitted' },
  };

  const variant = variants[status];
  return (
    <Badge variant="outline" className={variant.className}>
      {variant.label}
    </Badge>
  );
}

export function ReportHistoryTable({ initialVendors = [] }: ReportHistoryTableProps) {
  // State
  const [reports, setReports] = React.useState<ReportHistoryItem[]>([]);
  const [vendors, setVendors] = React.useState<AssignedVendor[]>(initialVendors);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Pagination state
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);

  // Filter state
  const [selectedVendorId, setSelectedVendorId] = React.useState<string>('all');
  const [fromDate, setFromDate] = React.useState<string>('');
  const [toDate, setToDate] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  // Sort state
  const [sortBy, setSortBy] = React.useState<string>('weekStart');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  // Modal state
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Debounce timer ref
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchVendors = React.useCallback(async () => {
    try {
      const response = await fetch('/api/reporting/vendors');
      const data = await response.json();

      if (data.success) {
        setVendors(data.data?.vendors || []);
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  }, []);

  const fetchReports = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (selectedVendorId !== 'all') {
        params.append('vendorId', selectedVendorId);
      }
      if (fromDate) {
        params.append('fromDate', fromDate);
      }
      if (toDate) {
        params.append('toDate', toDate);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      params.append('page', page.toString());
      params.append('limit', pageSize.toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/reporting/reports/history?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.data) {
        const historyData = data.data as ReportHistoryResponse;
        setReports(historyData.reports);
        setTotal(historyData.total);
        setTotalPages(historyData.totalPages);
      } else {
        setError(data.error || 'Failed to fetch reports');
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to fetch reports');
    } finally {
      setIsLoading(false);
    }
  }, [selectedVendorId, fromDate, toDate, statusFilter, page, pageSize, sortBy, sortOrder]);

  // Fetch vendors if not provided
  React.useEffect(() => {
    if (initialVendors.length === 0) {
      fetchVendors();
    }
  }, [initialVendors.length, fetchVendors]);

  // Fetch reports when filters change (with debounce)
  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchReports();
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchReports]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleViewReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSelectedVendorId('all');
    setFromDate('');
    setToDate('');
    setStatusFilter('all');
    setPage(1);
  };

  const hasFilters = selectedVendorId !== 'all' || fromDate || toDate || statusFilter !== 'all';

  // Validate date range
  const isDateRangeInvalid = fromDate && toDate && new Date(fromDate) > new Date(toDate);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Report History</CardTitle>
                <CardDescription>
                  View and browse previously submitted weekly reports
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Vendor Filter */}
            <div className="space-y-1">
              <Label htmlFor="vendor-filter" className="text-xs">
                Vendor
              </Label>
              <Select
                value={selectedVendorId}
                onValueChange={(value) => {
                  setSelectedVendorId(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="vendor-filter" data-testid="vendor-filter">
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* From Date Filter */}
            <div className="space-y-1">
              <Label htmlFor="from-date" className="text-xs">
                Week Start From
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                  data-testid="from-date-filter"
                />
              </div>
            </div>

            {/* To Date Filter */}
            <div className="space-y-1">
              <Label htmlFor="to-date" className="text-xs">
                Week Start To
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className={`pl-9 ${isDateRangeInvalid ? 'border-red-500' : ''}`}
                  data-testid="to-date-filter"
                />
              </div>
              {isDateRangeInvalid && (
                <p className="text-xs text-red-500">To date must be after from date</p>
              )}
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <Label htmlFor="status-filter" className="text-xs">
                Status
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="status-filter" data-testid="status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasFilters && (
            <div className="flex justify-end mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-destructive/15 p-4 text-destructive mb-4">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading reports...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && reports.length === 0 && vendors.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Vendors Assigned</h3>
              <p className="text-muted-foreground mb-4">
                You don&apos;t have any vendors assigned for delivery reporting.
              </p>
            </div>
          )}

          {!isLoading && reports.length === 0 && vendors.length > 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Reports Found</h3>
              <p className="text-muted-foreground mb-4">
                {hasFilters
                  ? 'No reports match your current filters. Try adjusting your search criteria.'
                  : 'You haven\'t created any weekly reports yet.'}
              </p>
              <Link href="/reporting/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </Button>
              </Link>
            </div>
          )}

          {/* Reports Table */}
          {!isLoading && reports.length > 0 && (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button
                          onClick={() => handleSort('vendorName')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Vendor Name
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('weekStart')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Week Starting
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>RAG Status</TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('status')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Status
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('submittedAt')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Submitted Date
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {report.vendorName}
                        </TableCell>
                        <TableCell>{formatWeekDate(report.weekStart)}</TableCell>
                        <TableCell>
                          <RAGStatusBadge status={report.ragStatus} />
                        </TableCell>
                        <TableCell>
                          <ReportStatusBadge status={report.status} />
                        </TableCell>
                        <TableCell>
                          {formatSubmittedDate(report.submittedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReport(report.id)}
                            data-testid={`view-report-${report.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min(page * pageSize, total)} of {total} reports
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Report Detail Modal */}
      <ReportDetailModal
        reportId={selectedReportId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
