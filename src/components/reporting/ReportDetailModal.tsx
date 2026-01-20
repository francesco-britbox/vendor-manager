'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  CheckCircle2,
  Clock,
  Target,
  AlertCircle,
} from 'lucide-react';
import type { RAGStatus, ReportStatus, Achievement, FocusItem } from '@/types/delivery-reporting';

// Report detail response type (matching API)
interface ReportDetailResponse {
  id: string;
  vendorId: string;
  vendorName: string;
  weekStart: string;
  ragStatus: RAGStatus | null;
  status: ReportStatus;
  submittedAt: string | null;
  achievements: Achievement[];
  focusItems: FocusItem[];
  createdAt: string;
  updatedAt: string;
}

interface ReportDetailModalProps {
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  if (!dateString) return 'Not submitted';
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

// Achievement status icon
function AchievementStatusIcon({ status }: { status: Achievement['status'] }) {
  if (status === 'done') {
    return <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />;
  }
  if (status === 'in_progress') {
    return <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />;
  }
  return <AlertCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />;
}

export function ReportDetailModal({
  reportId,
  open,
  onOpenChange,
}: ReportDetailModalProps) {
  const [report, setReport] = React.useState<ReportDetailResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchReportDetails = React.useCallback(async () => {
    if (!reportId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reporting/reports/history/${reportId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setReport(data.data);
      } else {
        setError(data.error || 'Failed to fetch report details');
      }
    } catch (err) {
      console.error('Failed to fetch report details:', err);
      setError('Failed to fetch report details');
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  // Fetch report details when modal opens
  React.useEffect(() => {
    if (open && reportId) {
      fetchReportDetails();
    } else if (!open) {
      // Reset state when modal closes
      setReport(null);
      setError(null);
    }
  }, [open, reportId, fetchReportDetails]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            Weekly Report
          </DialogTitle>
          <DialogDescription>
            {report ? `View report details for ${report.vendorName}` : 'Loading report details...'}
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading report...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="py-8">
            <div className="rounded-md bg-destructive/15 p-4 text-destructive text-center">
              {error}
            </div>
          </div>
        )}

        {/* Report Content */}
        {report && !isLoading && !error && (
          <>

            {/* Report Header Info */}
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Vendor</p>
                      <p className="font-medium">{report.vendorName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Week Starting</p>
                      <p className="font-medium">{formatWeekDate(report.weekStart)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">RAG Status</p>
                      <RAGStatusBadge status={report.ragStatus} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <ReportStatusBadge status={report.status} />
                    </div>
                  </div>
                  {report.submittedAt && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        Submitted: {formatSubmittedDate(report.submittedAt)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Achievements Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.achievements.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No achievements recorded for this week.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {report.achievements.map((achievement) => (
                        <li
                          key={achievement.id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <AchievementStatusIcon status={achievement.status} />
                          <span className={achievement.status === 'done' ? '' : 'text-muted-foreground'}>
                            {achievement.description}
                            {achievement.isFromFocus && (
                              <span className="ml-2 text-xs text-blue-600">(from focus)</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Focus Items Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    Focus for Next Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.focusItems.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No focus items recorded for the next week.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {report.focusItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <div className="h-4 w-4 flex items-center justify-center flex-shrink-0">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                          </div>
                          <span>
                            {item.description}
                            {item.isCarriedOver && (
                              <span className="ml-2 text-xs text-amber-600">(carried over)</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
