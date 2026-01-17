'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Download,
  Brain,
  Loader2,
} from 'lucide-react';
import type { DocumentType, VendorDocument, VendorDocumentAnalysis } from '@/types';
import { DOCUMENT_TYPE_LABELS } from '@/types';

interface DocumentStats {
  totalDocuments: number;
  analyzedDocuments: number;
  pendingAnalysis: number;
  failedAnalysis: number;
  expiringWithin30Days: number;
  expiringWithin90Days: number;
  byType: Record<DocumentType, number>;
  byMonth: { month: string; count: number }[];
  totalSize: number;
  averageAnalysisConfidence: number;
}

interface VendorDocumentAnalyticsProps {
  vendorId?: string; // Optional: if not provided, shows global analytics
  vendorName?: string;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Document analytics and reporting component
 */
export function VendorDocumentAnalytics({
  vendorId,
  vendorName,
}: VendorDocumentAnalyticsProps) {
  const [stats, setStats] = React.useState<DocumentStats | null>(null);
  const [documents, setDocuments] = React.useState<VendorDocument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedType, setSelectedType] = React.useState<DocumentType | 'all'>('all');

  // Fetch analytics data
  const fetchAnalytics = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (vendorId) params.set('vendorId', vendorId);
      if (timeRange !== 'all') params.set('timeRange', timeRange);
      if (selectedType !== 'all') params.set('documentType', selectedType);

      // Fetch documents based on vendor or all
      const endpoint = vendorId
        ? `/api/vendors/${vendorId}/documents?${params.toString()}`
        : `/api/vendors?includeDocuments=true&${params.toString()}`;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      // Calculate statistics from documents
      const docs: VendorDocument[] = vendorId
        ? data.data
        : data.data.flatMap((v: { documents?: VendorDocument[] }) => v.documents || []);

      setDocuments(docs);
      setStats(calculateStats(docs));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  }, [vendorId, timeRange, selectedType]);

  // Calculate statistics from documents
  const calculateStats = (docs: VendorDocument[]): DocumentStats => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const byType: Record<DocumentType, number> = {} as Record<DocumentType, number>;
    Object.keys(DOCUMENT_TYPE_LABELS).forEach((type) => {
      byType[type as DocumentType] = 0;
    });

    const monthCounts: Record<string, number> = {};
    let totalSize = 0;
    let analyzedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let expiring30 = 0;
    let expiring90 = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    docs.forEach((doc) => {
      // Count by type
      if (doc.documentType) {
        byType[doc.documentType] = (byType[doc.documentType] || 0) + 1;
      }

      // Count by month
      const month = new Date(doc.uploadedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
      monthCounts[month] = (monthCounts[month] || 0) + 1;

      // Total size
      totalSize += doc.documentSize || 0;

      // Extraction status
      if (doc.extractionStatus === 'completed') {
        analyzedCount++;
      } else if (doc.extractionStatus === 'pending') {
        pendingCount++;
      } else if (doc.extractionStatus === 'failed') {
        failedCount++;
      }

      // Expiring documents
      if (doc.expiryDate) {
        const expiryDate = new Date(doc.expiryDate);
        if (expiryDate <= thirtyDaysFromNow && expiryDate > now) {
          expiring30++;
        }
        if (expiryDate <= ninetyDaysFromNow && expiryDate > now) {
          expiring90++;
        }
      }

      // Average confidence from AI analysis
      const analysis = doc.aiAnalysis as VendorDocumentAnalysis | undefined;
      if (analysis?.confidenceScores) {
        const scores = Object.values(analysis.confidenceScores).filter(
          (s): s is number => typeof s === 'number'
        );
        if (scores.length > 0) {
          totalConfidence += scores.reduce((a, b) => a + b, 0) / scores.length;
          confidenceCount++;
        }
      }
    });

    // Convert month counts to sorted array
    const byMonth = Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-12); // Last 12 months

    return {
      totalDocuments: docs.length,
      analyzedDocuments: analyzedCount,
      pendingAnalysis: pendingCount,
      failedAnalysis: failedCount,
      expiringWithin30Days: expiring30,
      expiringWithin90Days: expiring90,
      byType,
      byMonth,
      totalSize,
      averageAnalysisConfidence:
        confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
    };
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!documents.length) return;

    const headers = [
      'Title',
      'Type',
      'File Name',
      'Size',
      'Upload Date',
      'Expiry Date',
      'Analysis Status',
      'Vendor ID',
    ];

    const rows = documents.map((doc) => [
      doc.title || '',
      DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType,
      doc.documentName,
      formatBytes(doc.documentSize || 0),
      new Date(doc.uploadedAt).toLocaleDateString(),
      doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '',
      doc.extractionStatus || 'none',
      doc.vendorId,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Fetch on mount and when filters change
  React.useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading && !stats) {
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
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Document Analytics
          </h2>
          {vendorName && (
            <p className="text-sm text-muted-foreground">
              Analysis for {vendorName}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={selectedType}
            onValueChange={(v) => setSelectedType(v as typeof selectedType)}
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
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDocuments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatBytes(stats?.totalSize || 0)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Analyzed</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.analyzedDocuments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingAnalysis || 0} pending, {stats?.failedAnalysis || 0} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats?.expiringWithin30Days || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.expiringWithin90Days || 0} within 90 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageAnalysisConfidence
                ? `${Math.round(stats.averageAnalysisConfidence * 100)}%`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">AI extraction accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Document Types Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Documents by Type</CardTitle>
          <CardDescription>Distribution of documents across different categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats?.byType &&
              Object.entries(stats.byType)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="text-sm font-medium">
                      {DOCUMENT_TYPE_LABELS[type as DocumentType] || type}
                    </span>
                    <span className="text-sm text-muted-foreground">{count}</span>
                  </div>
                ))}
            {stats?.byType &&
              Object.values(stats.byType).every((c) => c === 0) && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                  No documents to display
                </p>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Trend</CardTitle>
          <CardDescription>Documents uploaded per month</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.byMonth && stats.byMonth.length > 0 ? (
            <div className="space-y-4">
              {stats.byMonth.map((item) => {
                const maxCount = Math.max(...stats.byMonth.map((m) => m.count));
                const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                return (
                  <div key={item.month} className="flex items-center gap-4">
                    <span className="text-sm font-medium w-20 flex-shrink-0">
                      {item.month}
                    </span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No upload history to display
            </p>
          )}
        </CardContent>
      </Card>

      {/* Analysis Status */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Status</CardTitle>
          <CardDescription>AI extraction progress for uploaded documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{stats?.analyzedDocuments || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold">{stats?.pendingAnalysis || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium">Failed</p>
                <p className="text-2xl font-bold">{stats?.failedAnalysis || 0}</p>
              </div>
            </div>
          </div>

          {stats && stats.totalDocuments > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Analysis Progress</span>
                <span>
                  {Math.round(
                    ((stats.analyzedDocuments || 0) / stats.totalDocuments) * 100
                  )}
                  %
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${
                      ((stats.analyzedDocuments || 0) / stats.totalDocuments) * 100
                    }%`,
                  }}
                />
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${
                      ((stats.pendingAnalysis || 0) / stats.totalDocuments) * 100
                    }%`,
                  }}
                />
                <div
                  className="h-full bg-destructive"
                  style={{
                    width: `${
                      ((stats.failedAnalysis || 0) / stats.totalDocuments) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
