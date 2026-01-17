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
  AlertTriangle,
  Calendar,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { DocumentType, VendorDocument } from '@/types';
import { DOCUMENT_TYPE_LABELS } from '@/types';

interface ExpiryReportDocument extends VendorDocument {
  vendorName?: string;
  daysUntilExpiry: number;
}

interface VendorDocumentExpiryReportProps {
  vendorId?: string; // Optional: if not provided, shows all vendors
  onDocumentClick?: (document: VendorDocument) => void;
}

/**
 * Get expiry urgency class based on days remaining
 */
function getExpiryUrgency(days: number): {
  className: string;
  label: string;
} {
  if (days < 0) {
    return { className: 'text-destructive bg-destructive/10', label: 'Expired' };
  }
  if (days <= 7) {
    return { className: 'text-destructive bg-destructive/10', label: 'Critical' };
  }
  if (days <= 30) {
    return { className: 'text-amber-600 bg-amber-100', label: 'Urgent' };
  }
  if (days <= 90) {
    return { className: 'text-yellow-600 bg-yellow-100', label: 'Attention' };
  }
  return { className: 'text-green-600 bg-green-100', label: 'OK' };
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Document expiry report component
 */
export function VendorDocumentExpiryReport({
  vendorId,
  onDocumentClick,
}: VendorDocumentExpiryReportProps) {
  const [documents, setDocuments] = React.useState<ExpiryReportDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filterRange, setFilterRange] = React.useState<'30' | '60' | '90' | '180' | 'all'>('90');
  const [filterType, setFilterType] = React.useState<DocumentType | 'all'>('all');
  const [sortBy, setSortBy] = React.useState<'expiry' | 'vendor' | 'type'>('expiry');

  // Fetch expiring documents
  const fetchExpiringDocuments = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterRange !== 'all') {
        params.set('expiringWithinDays', filterRange);
      }
      if (filterType !== 'all') {
        params.set('documentType', filterType);
      }

      // Fetch from appropriate endpoint
      const endpoint = vendorId
        ? `/api/vendors/${vendorId}/documents?${params.toString()}`
        : `/api/vendors?includeDocuments=true`;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch documents');
      }

      // Process documents and calculate days until expiry
      const now = new Date();
      let docs: ExpiryReportDocument[];

      if (vendorId) {
        docs = (data.data as VendorDocument[])
          .filter((doc) => doc.expiryDate)
          .map((doc) => ({
            ...doc,
            daysUntilExpiry: Math.ceil(
              (new Date(doc.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            ),
          }));
      } else {
        docs = data.data.flatMap(
          (vendor: { id: string; name: string; documents?: VendorDocument[] }) =>
            (vendor.documents || [])
              .filter((doc: VendorDocument) => doc.expiryDate)
              .map((doc: VendorDocument) => ({
                ...doc,
                vendorName: vendor.name,
                daysUntilExpiry: Math.ceil(
                  (new Date(doc.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                ),
              }))
        );
      }

      // Apply filter range
      if (filterRange !== 'all') {
        const maxDays = parseInt(filterRange);
        docs = docs.filter((doc) => doc.daysUntilExpiry <= maxDays);
      }

      // Apply type filter
      if (filterType !== 'all') {
        docs = docs.filter((doc) => doc.documentType === filterType);
      }

      // Sort documents
      docs.sort((a, b) => {
        switch (sortBy) {
          case 'vendor':
            return (a.vendorName || '').localeCompare(b.vendorName || '');
          case 'type':
            return a.documentType.localeCompare(b.documentType);
          case 'expiry':
          default:
            return a.daysUntilExpiry - b.daysUntilExpiry;
        }
      });

      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  }, [vendorId, filterRange, filterType, sortBy]);

  // Export to CSV
  const exportToCSV = () => {
    if (!documents.length) return;

    const headers = [
      'Document Title',
      'Type',
      'Vendor',
      'Expiry Date',
      'Days Until Expiry',
      'Status',
    ];

    const rows = documents.map((doc) => {
      const urgency = getExpiryUrgency(doc.daysUntilExpiry);
      return [
        doc.title || doc.documentName,
        DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType,
        doc.vendorName || 'N/A',
        doc.expiryDate ? formatDate(new Date(doc.expiryDate)) : '',
        doc.daysUntilExpiry.toString(),
        urgency.label,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-expiry-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Fetch on mount and when filters change
  React.useEffect(() => {
    fetchExpiringDocuments();
  }, [fetchExpiringDocuments]);

  // Summary stats
  const stats = React.useMemo(() => {
    const expired = documents.filter((d) => d.daysUntilExpiry < 0).length;
    const critical = documents.filter((d) => d.daysUntilExpiry >= 0 && d.daysUntilExpiry <= 7).length;
    const urgent = documents.filter((d) => d.daysUntilExpiry > 7 && d.daysUntilExpiry <= 30).length;
    const attention = documents.filter((d) => d.daysUntilExpiry > 30 && d.daysUntilExpiry <= 90).length;
    return { expired, critical, urgent, attention };
  }, [documents]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchExpiringDocuments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Document Expiry Report
              </CardTitle>
              <CardDescription>
                Track document expirations and renewal deadlines
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filterRange}
                onValueChange={(v) => setFilterRange(v as typeof filterRange)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Next 30 days</SelectItem>
                  <SelectItem value="60">Next 60 days</SelectItem>
                  <SelectItem value="90">Next 90 days</SelectItem>
                  <SelectItem value="180">Next 6 months</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v as typeof filterType)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => (
                    <SelectItem key={type} value={type}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchExpiringDocuments}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats.expired}</div>
            <p className="text-sm text-muted-foreground">Expired</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
            <p className="text-sm text-muted-foreground">Critical (&lt;7 days)</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{stats.urgent}</div>
            <p className="text-sm text-muted-foreground">Urgent (8-30 days)</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/50">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.attention}</div>
            <p className="text-sm text-muted-foreground">Attention (31-90 days)</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expiring Documents ({documents.length})</CardTitle>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expiry">Sort by Expiry</SelectItem>
                <SelectItem value="vendor">Sort by Vendor</SelectItem>
                <SelectItem value="type">Sort by Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No expiring documents</p>
              <p className="text-sm text-muted-foreground">
                No documents are expiring within the selected time range.
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    {!vendorId && <TableHead>Vendor</TableHead>}
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Days Left</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => {
                    const urgency = getExpiryUrgency(doc.daysUntilExpiry);
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{doc.title || doc.documentName}</p>
                            {doc.title && (
                              <p className="text-xs text-muted-foreground">
                                {doc.documentName}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                          </span>
                        </TableCell>
                        {!vendorId && (
                          <TableCell>
                            <span className="text-sm">{doc.vendorName || 'Unknown'}</span>
                          </TableCell>
                        )}
                        <TableCell>
                          <span className="text-sm">
                            {doc.expiryDate ? formatDate(new Date(doc.expiryDate)) : 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-medium ${
                              doc.daysUntilExpiry < 0
                                ? 'text-destructive'
                                : doc.daysUntilExpiry <= 30
                                ? 'text-amber-600'
                                : ''
                            }`}
                          >
                            {doc.daysUntilExpiry < 0
                              ? `${Math.abs(doc.daysUntilExpiry)} days ago`
                              : `${doc.daysUntilExpiry} days`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${urgency.className}`}
                          >
                            {urgency.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {onDocumentClick && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDocumentClick(doc)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
