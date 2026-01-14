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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Building2,
  Calendar,
  Save,
  Loader2,
  Check,
  Undo2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeOffCode } from '@/types';

// Constants
const DEFAULT_WORKDAY_HOURS = 8;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Types
interface Vendor {
  id: string;
  name: string;
}

interface TeamMemberWithVendor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dailyRate: number;
  currency: string;
  vendor?: {
    id: string;
    name: string;
  };
}

interface TeamMemberEntry {
  teamMemberId: string;
  hours: number;
  days: number;
  timeOffDays: Record<TimeOffCode, number>;
  hasChanges: boolean;
}

interface UndoAction {
  type: 'entry_change';
  teamMemberId: string;
  previousValue: TeamMemberEntry;
  timestamp: number;
}

interface VendorTimesheetEntryProps {
  workdayHours?: number;
}

/**
 * Vendor-based time entry component with cascading selection
 * and bulk entry for all team members under a vendor
 */
export function VendorTimesheetEntry({
  workdayHours = DEFAULT_WORKDAY_HOURS,
}: VendorTimesheetEntryProps) {
  // State
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMemberWithVendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = React.useState<string>('');
  const [month, setMonth] = React.useState(() => new Date().getMonth() + 1);
  const [year, setYear] = React.useState(() => new Date().getFullYear());
  const [entries, setEntries] = React.useState<Map<string, TeamMemberEntry>>(new Map());
  const [undoStack, setUndoStack] = React.useState<UndoAction[]>([]);

  // Loading and status states
  const [isLoadingVendors, setIsLoadingVendors] = React.useState(true);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  // Filtered team members for selected vendor
  const filteredTeamMembers = React.useMemo(() => {
    if (!selectedVendorId) return [];
    return teamMembers.filter((tm) => tm.vendor?.id === selectedVendorId);
  }, [teamMembers, selectedVendorId]);

  // Calculate totals
  const totals = React.useMemo(() => {
    let totalHours = 0;
    let totalDays = 0;
    let totalSpend = 0;
    let totalTimeOff = 0;

    for (const [teamMemberId, entry] of entries) {
      const member = teamMembers.find((tm) => tm.id === teamMemberId);
      if (member) {
        totalHours += entry.hours;
        totalDays += entry.days;
        totalSpend += entry.days * member.dailyRate;
        totalTimeOff += Object.values(entry.timeOffDays).reduce((a, b) => a + b, 0);
      }
    }

    return { totalHours, totalDays, totalSpend, totalTimeOff };
  }, [entries, teamMembers]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = React.useMemo(() => {
    for (const entry of entries.values()) {
      if (entry.hasChanges) return true;
    }
    return false;
  }, [entries]);

  // Fetch vendors on mount
  React.useEffect(() => {
    fetchVendors();
  }, []);

  // Fetch team members when vendor changes
  React.useEffect(() => {
    if (selectedVendorId) {
      fetchTeamMembers();
    }
  }, [selectedVendorId]);

  // Fetch existing entries when vendor or month changes
  React.useEffect(() => {
    if (selectedVendorId && filteredTeamMembers.length > 0) {
      fetchExistingEntries();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVendorId, month, year, filteredTeamMembers.length]);

  const fetchVendors = async () => {
    try {
      setIsLoadingVendors(true);
      const response = await fetch('/api/vendors?status=active');
      const data = await response.json();

      if (data.success) {
        setVendors(data.data.vendors);
      } else {
        setError(data.error || 'Failed to fetch vendors');
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
      setError('Failed to fetch vendors');
    } finally {
      setIsLoadingVendors(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      setIsLoadingTeamMembers(true);
      const response = await fetch(`/api/team-members?vendorId=${selectedVendorId}&status=active`);
      const data = await response.json();

      if (data.success) {
        setTeamMembers(data.data.teamMembers);
        // Initialize entries for all team members
        initializeEntries(data.data.teamMembers);
      } else {
        setError(data.error || 'Failed to fetch team members');
      }
    } catch (err) {
      console.error('Failed to fetch team members:', err);
      setError('Failed to fetch team members');
    } finally {
      setIsLoadingTeamMembers(false);
    }
  };

  const fetchExistingEntries = async () => {
    try {
      const teamMemberIds = filteredTeamMembers.map((tm) => tm.id).join(',');
      const response = await fetch(
        `/api/timesheet-entries?teamMemberIds=${teamMemberIds}&month=${month}&year=${year}&includeSummary=true`
      );
      const data = await response.json();

      if (data.success && data.data.summary) {
        // Update entries with fetched data
        const newEntries = new Map(entries);
        for (const summary of data.data.summary) {
          const existing = newEntries.get(summary.teamMemberId);
          if (existing) {
            newEntries.set(summary.teamMemberId, {
              ...existing,
              hours: summary.totalHours,
              days: summary.totalWorkingDays,
              timeOffDays: summary.timeOffBreakdown,
              hasChanges: false,
            });
          }
        }
        setEntries(newEntries);
      }
    } catch (err) {
      console.error('Failed to fetch existing entries:', err);
    }
  };

  const initializeEntries = (members: TeamMemberWithVendor[]) => {
    const newEntries = new Map<string, TeamMemberEntry>();
    for (const member of members) {
      if (member.vendor?.id === selectedVendorId) {
        newEntries.set(member.id, {
          teamMemberId: member.id,
          hours: 0,
          days: 0,
          timeOffDays: {
            VAC: 0,
            HALF: 0,
            SICK: 0,
            MAT: 0,
            CAS: 0,
            UNPAID: 0,
          },
          hasChanges: false,
        });
      }
    }
    setEntries(newEntries);
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setEntries(new Map());
    setUndoStack([]);
    setError(null);
    setSuccess(null);
  };

  const handleHoursChange = (teamMemberId: string, hoursStr: string) => {
    const hours = parseFloat(hoursStr) || 0;
    const days = hours / workdayHours;

    updateEntry(teamMemberId, { hours, days });
  };

  const handleDaysChange = (teamMemberId: string, daysStr: string) => {
    const days = parseFloat(daysStr) || 0;
    const hours = days * workdayHours;

    updateEntry(teamMemberId, { hours, days });
  };

  const updateEntry = (
    teamMemberId: string,
    updates: Partial<TeamMemberEntry>
  ) => {
    const currentEntry = entries.get(teamMemberId);
    if (!currentEntry) return;

    // Save to undo stack
    setUndoStack((prev) => [
      ...prev.slice(-19), // Keep last 20 actions
      {
        type: 'entry_change',
        teamMemberId,
        previousValue: { ...currentEntry },
        timestamp: Date.now(),
      },
    ]);

    setEntries((prev) => {
      const next = new Map(prev);
      next.set(teamMemberId, {
        ...currentEntry,
        ...updates,
        hasChanges: true,
      });
      return next;
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    if (lastAction.type === 'entry_change') {
      setEntries((prev) => {
        const next = new Map(prev);
        next.set(lastAction.teamMemberId, lastAction.previousValue);
        return next;
      });
    }
  };

  const handleSaveClick = () => {
    if (!hasUnsavedChanges) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmDialog(false);
    await saveEntries();
  };

  const saveEntries = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      // Build entries to save
      const entriesToSave: {
        teamMemberId: string;
        date: string;
        hours?: number | null;
        timeOffCode?: TimeOffCode | null;
      }[] = [];

      // Get the number of working days in the month
      const daysInMonth = new Date(year, month, 0).getDate();

      for (const [teamMemberId, entry] of entries) {
        if (!entry.hasChanges) continue;

        // For simplicity, we'll distribute hours evenly across working days
        // A more sophisticated approach would use the calendar view
        const workDaysInMonth = getWorkDaysInMonth(year, month);
        const hoursPerDay = entry.hours > 0 ? entry.hours / workDaysInMonth : 0;

        // Create entries for each working day
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month - 1, day);
          const dayOfWeek = date.getDay();

          // Skip weekends
          if (dayOfWeek === 0 || dayOfWeek === 6) continue;

          const dateStr = date.toISOString().split('T')[0];

          entriesToSave.push({
            teamMemberId,
            date: new Date(dateStr).toISOString(),
            hours: hoursPerDay > 0 ? Math.round(hoursPerDay * 100) / 100 : null,
            timeOffCode: null,
          });
        }

        // Add time-off entries
        for (const [code, days] of Object.entries(entry.timeOffDays)) {
          if (days > 0) {
            // We need to assign specific dates for time-off
            // For now, we'll create placeholder entries
            for (let i = 0; i < days; i++) {
              const date = new Date(year, month - 1, 1 + i);
              entriesToSave.push({
                teamMemberId,
                date: date.toISOString(),
                hours: null,
                timeOffCode: code as TimeOffCode,
              });
            }
          }
        }
      }

      if (entriesToSave.length === 0) {
        setSuccess('No changes to save');
        return;
      }

      const response = await fetch('/api/timesheet-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: entriesToSave }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Timesheet entries saved successfully');
        // Mark all entries as saved
        setEntries((prev) => {
          const next = new Map(prev);
          for (const [id, entry] of next) {
            next.set(id, { ...entry, hasChanges: false });
          }
          return next;
        });
        setUndoStack([]);
      } else {
        setError(data.error || 'Failed to save timesheet entries');
      }
    } catch (err) {
      console.error('Failed to save timesheet entries:', err);
      setError('Failed to save timesheet entries');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMonthChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
  };

  const handlePreviousMonth = () => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    handleMonthChange(prevMonth, prevYear);
  };

  const handleNextMonth = () => {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    handleMonthChange(nextMonth, nextYear);
  };

  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  // Get selected vendor name
  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div
          className="rounded-md bg-destructive/15 p-4 text-destructive"
          data-testid="vendor-timesheet-error"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-md bg-green-500/15 p-4 text-green-700"
          data-testid="vendor-timesheet-success"
        >
          {success}
        </div>
      )}

      {/* Vendor and Month Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Vendor Team Timesheet
          </CardTitle>
          <CardDescription>
            Select a vendor to enter monthly timesheets for all team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Selection */}
            <div className="space-y-2">
              <Label htmlFor="vendor-select">Vendor</Label>
              <Select
                value={selectedVendorId}
                onValueChange={handleVendorChange}
                disabled={isLoadingVendors}
              >
                <SelectTrigger id="vendor-select" data-testid="vendor-select">
                  <SelectValue placeholder="Select a vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Navigation */}
            <div className="space-y-2">
              <Label>Period</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                  disabled={isLoadingTeamMembers || isSaving}
                  data-testid="prev-month-btn"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center font-medium" data-testid="current-period">
                  {MONTH_NAMES[month - 1]} {year}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  disabled={isLoadingTeamMembers || isSaving}
                  data-testid="next-month-btn"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Entry Grid */}
      {selectedVendorId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {selectedVendor?.name} Team Members
                </CardTitle>
                <CardDescription>
                  Enter hours or days for each team member (1 day = {workdayHours} hours)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={undoStack.length === 0 || isSaving}
                  data-testid="undo-btn"
                >
                  <Undo2 className="h-4 w-4 mr-1" />
                  Undo
                </Button>
                <Button
                  onClick={handleSaveClick}
                  disabled={!hasUnsavedChanges || isSaving}
                  data-testid="save-all-btn"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save All
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTeamMembers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTeamMembers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No team members found for this vendor
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Team Member</TableHead>
                      <TableHead className="text-right w-[100px]">Hours</TableHead>
                      <TableHead className="text-right w-[100px]">Days</TableHead>
                      <TableHead className="text-right w-[100px]">Daily Rate</TableHead>
                      <TableHead className="text-right w-[100px]">Est. Spend</TableHead>
                      <TableHead className="text-center w-[80px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeamMembers.map((member) => {
                      const entry = entries.get(member.id);
                      const estimatedSpend = entry ? entry.days * member.dailyRate : 0;

                      return (
                        <TableRow
                          key={member.id}
                          className={cn(entry?.hasChanges && 'bg-yellow-50/50')}
                          data-testid={`member-row-${member.id}`}
                        >
                          <TableCell className="font-medium">
                            {member.firstName} {member.lastName}
                            <div className="text-xs text-muted-foreground">
                              {member.email}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              max="744"
                              step="0.5"
                              value={entry?.hours || ''}
                              onChange={(e) => handleHoursChange(member.id, e.target.value)}
                              disabled={isSaving}
                              className="w-20 text-right ml-auto"
                              placeholder="0"
                              data-testid={`hours-input-${member.id}`}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="0"
                              max="31"
                              step="0.5"
                              value={entry?.days || ''}
                              onChange={(e) => handleDaysChange(member.id, e.target.value)}
                              disabled={isSaving}
                              className="w-20 text-right ml-auto"
                              placeholder="0"
                              data-testid={`days-input-${member.id}`}
                            />
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(member.dailyRate, member.currency)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {formatCurrency(estimatedSpend, member.currency)}
                          </TableCell>
                          <TableCell className="text-center">
                            {entry?.hasChanges ? (
                              <span className="text-yellow-600" title="Unsaved changes">
                                <Calendar className="h-4 w-4 inline" />
                              </span>
                            ) : entry?.hours || entry?.days ? (
                              <span className="text-green-600" title="Saved">
                                <Check className="h-4 w-4 inline" />
                              </span>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{totals.totalHours.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{totals.totalDays.toFixed(2)}</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(totals.totalSpend)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Save</DialogTitle>
            <DialogDescription>
              You are about to save timesheet entries for {filteredTeamMembers.length} team members
              for {MONTH_NAMES[month - 1]} {year}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Hours:</span>
                <span className="ml-2 font-semibold">{totals.totalHours.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Days:</span>
                <span className="ml-2 font-semibold">{totals.totalDays.toFixed(2)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Estimated Spend:</span>
                <span className="ml-2 font-semibold text-green-600">
                  {formatCurrency(totals.totalSpend)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmSave}>
              <Check className="h-4 w-4 mr-2" />
              Confirm Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to get working days in a month
function getWorkDaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
  }

  return workDays;
}
