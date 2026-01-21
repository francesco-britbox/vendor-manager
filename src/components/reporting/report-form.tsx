'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Send, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VendorTabs } from './vendor-tabs';
import { WeekSelector } from './week-selector';
import { SaveStatusIndicator } from './save-status-indicator';
import { RAGStatusSelector } from './rag-status-selector';
import { AchievementsSection } from './achievements-section';
import { FocusSection } from './focus-section';
import { TimelineSection } from './timeline-section';
import { RAIDSection } from './raid-section';
import { ResourcesSection } from './resources-section';
import type {
  AssignedVendor,
  Achievement,
  FocusItem,
  TimelineMilestone,
  RaidItem,
  VendorResourceItem,
  WeeklyReportData,
  RAGStatus,
  SaveStatus,
} from '@/types/delivery-reporting';

interface ReportFormProps {
  initialVendors: AssignedVendor[];
  userId: string;
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Get Monday of the current week
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export function ReportForm({ initialVendors, userId }: ReportFormProps) {
  // Core state
  const [vendors] = useState<AssignedVendor[]>(initialVendors);
  const [currentVendorId, setCurrentVendorId] = useState<string | null>(
    initialVendors[0]?.id || null
  );
  const [selectedWeek, setSelectedWeek] = useState<string>(getWeekStart());
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Report data state
  const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineMilestone[]>([]);
  const [raidItems, setRaidItems] = useState<RaidItem[]>([]);
  const [resources, setResources] = useState<VendorResourceItem[]>([]);
  const [reportStatus, setReportStatus] = useState<'draft' | 'submitted'>('draft');
  const [submittedAt, setSubmittedAt] = useState<string | undefined>();

  // UI state
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track if data has changed for autosave
  const [isDirty, setIsDirty] = useState(false);
  const lastSavedRef = useRef<string>('');

  // Create a data snapshot for debounced autosave
  const dataSnapshot = JSON.stringify({
    ragStatus,
    achievements,
    focusItems,
  });
  const debouncedData = useDebounce(dataSnapshot, 500);

  // Load report data when vendor or week changes
  useEffect(() => {
    if (!currentVendorId) return;

    const loadData = async () => {
      setIsLoading(true);
      setSaveStatus('idle');

      try {
        // Fetch report data
        const reportRes = await fetch(
          `/api/reporting/reports?vendorId=${currentVendorId}&weekStart=${selectedWeek}`
        );
        const reportData = await reportRes.json();

        if (reportData.success) {
          const { report, previousWeekFocus, isNew } = reportData.data;

          if (report) {
            setRagStatus(report.ragStatus);
            // Add clientId to loaded items for stable React keys
            setAchievements(
              report.achievements.map((a: Achievement) => ({
                ...a,
                clientId: a.clientId || crypto.randomUUID(),
              }))
            );
            setFocusItems(
              report.focusItems.map((f: FocusItem) => ({
                ...f,
                clientId: f.clientId || crypto.randomUUID(),
              }))
            );
            setReportStatus(report.status);
            setSubmittedAt(report.submittedAt);
          } else {
            // New report - pre-populate achievements from previous week's focus
            setRagStatus(null);
            setReportStatus('draft');
            setSubmittedAt(undefined);

            if (previousWeekFocus && previousWeekFocus.length > 0) {
              const prePopulatedAchievements: Achievement[] = previousWeekFocus.map(
                (focus: FocusItem, index: number) => ({
                  clientId: crypto.randomUUID(), // Stable ID for React key
                  description: focus.description,
                  status: null,
                  isFromFocus: true,
                  sortOrder: index,
                })
              );
              setAchievements(prePopulatedAchievements);
            } else {
              setAchievements([]);
            }
            setFocusItems([]);
          }
        }

        // Fetch vendor-level data (timeline, RAID, resources)
        const [timelineRes, raidRes, resourcesRes] = await Promise.all([
          fetch(`/api/reporting/vendors/${currentVendorId}/timeline`),
          fetch(`/api/reporting/vendors/${currentVendorId}/raid`),
          fetch(`/api/reporting/vendors/${currentVendorId}/resources`),
        ]);

        const [timelineData, raidData, resourcesData] = await Promise.all([
          timelineRes.json(),
          raidRes.json(),
          resourcesRes.json(),
        ]);

        if (timelineData.success) {
          setTimeline(timelineData.data.items);
        }
        if (raidData.success) {
          setRaidItems(raidData.data.items);
        }
        if (resourcesData.success) {
          setResources(resourcesData.data.items);
        }

        // Update last saved snapshot
        lastSavedRef.current = JSON.stringify({
          ragStatus: reportData.data?.report?.ragStatus || null,
          achievements: reportData.data?.report?.achievements || [],
          focusItems: reportData.data?.report?.focusItems || [],
        });
        setIsDirty(false);
      } catch (error) {
        console.error('Error loading report data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentVendorId, selectedWeek]);

  // Autosave when data changes
  useEffect(() => {
    if (!currentVendorId || isLoading) return;
    if (debouncedData === lastSavedRef.current) return;

    const saveReport = async () => {
      setSaveStatus('saving');

      try {
        const response = await fetch('/api/reporting/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorId: currentVendorId,
            weekStart: selectedWeek,
            ragStatus,
            achievements,
            focusItems,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setSaveStatus('saved');
          lastSavedRef.current = debouncedData;
          setIsDirty(false);

          // Update IDs from server response while preserving clientId for stable React keys
          if (result.data?.achievements) {
            setAchievements((prev) =>
              prev.map((item, index) => ({
                ...item,
                id: result.data.achievements[index]?.id ?? item.id,
              }))
            );
          }
          if (result.data?.focusItems) {
            setFocusItems((prev) =>
              prev.map((item, index) => ({
                ...item,
                id: result.data.focusItems[index]?.id ?? item.id,
              }))
            );
          }
        } else {
          setSaveStatus('error');
          // Store in localStorage as backup
          localStorage.setItem(
            `report_backup_${currentVendorId}_${selectedWeek}`,
            debouncedData
          );
        }
      } catch (error) {
        console.error('Error saving report:', error);
        setSaveStatus('error');
        localStorage.setItem(
          `report_backup_${currentVendorId}_${selectedWeek}`,
          debouncedData
        );
      }
    };

    saveReport();
  }, [debouncedData, currentVendorId, selectedWeek, isLoading, ragStatus, achievements, focusItems]);

  // Handle achievement status change for bidirectional sync with focus
  const handleAchievementStatusChange = useCallback(
    (achievement: Achievement) => {
      if (achievement.status === 'in_progress') {
        // Add to focus if not already present
        const exists = focusItems.some(
          (f) => f.description === achievement.description && f.isCarriedOver
        );
        if (!exists) {
          setFocusItems((prev) => [
            ...prev,
            {
              clientId: crypto.randomUUID(), // Stable ID for React key
              description: achievement.description,
              isCarriedOver: true,
              sortOrder: prev.length,
            },
          ]);
        }
      } else {
        // Remove from focus if it was carried over
        setFocusItems((prev) =>
          prev.filter(
            (f) => !(f.description === achievement.description && f.isCarriedOver)
          )
        );
      }
      setIsDirty(true);
    },
    [focusItems]
  );

  // Handle vendor change
  const handleVendorChange = useCallback((vendorId: string) => {
    setCurrentVendorId(vendorId);
  }, []);

  // Handle week change
  const handleWeekChange = useCallback((weekStart: string) => {
    setSelectedWeek(weekStart);
  }, []);

  // Handle submit
  const handleSubmit = async () => {
    if (!currentVendorId) return;

    // Validation
    if (!ragStatus) {
      setSubmitError('Please select an overall RAG status before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/reporting/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: currentVendorId,
          weekStart: selectedWeek,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setReportStatus('submitted');
        setSubmittedAt(result.data?.submittedAt);
        setShowSubmitDialog(false);
      } else {
        setSubmitError(result.error || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      setSubmitError('An error occurred while submitting the report');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle copy from last week
  const handleCopyFromLastWeek = async () => {
    if (!currentVendorId) return;

    // Calculate previous week
    const currentDate = new Date(selectedWeek);
    const previousWeekStart = new Date(currentDate);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekString = previousWeekStart.toISOString().split('T')[0];

    try {
      const response = await fetch(
        `/api/reporting/reports?vendorId=${currentVendorId}&weekStart=${previousWeekString}`
      );
      const result = await response.json();

      if (result.success && result.data?.report) {
        const prevReport = result.data.report;
        setRagStatus(prevReport.ragStatus);
        // Don't copy achievements - they should be pre-populated from focus
        setFocusItems(
          prevReport.focusItems.map((f: FocusItem, index: number) => ({
            ...f,
            id: undefined,
            clientId: crypto.randomUUID(), // Stable ID for React key
            sortOrder: index,
          }))
        );
        setIsDirty(true);
      }
    } catch (error) {
      console.error('Error copying from last week:', error);
    }
  };

  // Handle retry save
  const handleRetrySave = useCallback(() => {
    setIsDirty(true);
    setSaveStatus('idle');
  }, []);

  const currentVendor = vendors.find((v) => v.id === currentVendorId);

  if (vendors.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Vendors Assigned</h3>
          <p className="text-muted-foreground">
            You don&apos;t have any vendors assigned for delivery reporting.
            <br />
            Please contact your administrator to get vendor access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <VendorTabs
            vendors={vendors}
            currentVendorId={currentVendorId}
            onVendorChange={handleVendorChange}
            isLoading={isLoading}
          />
        </div>
        <div className="flex items-center gap-4">
          <WeekSelector
            selectedWeek={selectedWeek}
            onWeekChange={handleWeekChange}
          />
          <SaveStatusIndicator status={saveStatus} onRetry={handleRetrySave} />
        </div>
      </div>

      {/* Report Status Banner */}
      {reportStatus === 'submitted' && submittedAt && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-green-700">
          <Send className="h-4 w-4" />
          <span>
            Submitted on{' '}
            {new Date(submittedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* RAG Status */}
          <Card>
            <CardContent className="pt-6">
              <RAGStatusSelector value={ragStatus} onChange={setRagStatus} />
            </CardContent>
          </Card>

          {/* Week-Specific Sections */}
          <AchievementsSection
            achievements={achievements}
            onChange={(items) => {
              setAchievements(items);
              setIsDirty(true);
            }}
            onAchievementStatusChange={handleAchievementStatusChange}
          />

          <FocusSection
            focusItems={focusItems}
            onChange={(items) => {
              setFocusItems(items);
              setIsDirty(true);
            }}
          />

          {/* Vendor-Level Sections */}
          <TimelineSection
            items={timeline}
            onChange={setTimeline}
            vendorId={currentVendorId}
          />

          <RAIDSection
            items={raidItems}
            onChange={setRaidItems}
            vendorId={currentVendorId}
          />

          <ResourcesSection
            items={resources}
            onChange={setResources}
            vendorId={currentVendorId}
          />

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCopyFromLastWeek}
              disabled={isLoading}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy from Last Week
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowSubmitDialog(true)}
                disabled={isLoading || reportStatus === 'submitted'}
              >
                <Send className="h-4 w-4 mr-2" />
                {reportStatus === 'submitted' ? 'Submitted' : 'Submit Report'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit the weekly report for{' '}
              <strong>{currentVendor?.name}</strong> for the week of{' '}
              <strong>
                {new Date(selectedWeek).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>

          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
              {submitError}
            </div>
          )}

          {achievements.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-700 text-sm">
              <strong>Warning:</strong> No achievements recorded for this week.
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
