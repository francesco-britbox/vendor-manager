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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  Loader2,
  Save,
  X,
  Clock,
  Briefcase,
  Palmtree,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeOffCode } from '@/types';

// Types
interface Vendor {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dailyRate: number;
  currency: string;
  vendorId: string;
}

interface CalendarDayEntry {
  date: string;
  dayOfWeek: number;
  isWeekend: boolean;
  entry?: {
    id: string;
    hours?: number;
    timeOffCode?: TimeOffCode;
  };
}

interface DayEdit {
  date: string;
  hours?: number | null;
  timeOffCode?: TimeOffCode | null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIME_OFF_CODES: { value: TimeOffCode; label: string; color: string }[] = [
  { value: 'VAC', label: 'Vacation', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'HALF', label: 'Half Day', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { value: 'SICK', label: 'Sick', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'MAT', label: 'Maternity', color: 'bg-pink-100 text-pink-800 border-pink-300' },
  { value: 'CAS', label: 'Casual', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'UNPAID', label: 'Unpaid', color: 'bg-gray-100 text-gray-800 border-gray-300' },
];

interface CalendarReviewProps {
  onDataChange?: () => void;
}

/**
 * Calendar-style review interface for timesheet entries
 * with visual indicators and inline editing
 */
export function CalendarReview({ onDataChange }: CalendarReviewProps) {
  // State
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [selectedVendorId, setSelectedVendorId] = React.useState<string>('');
  const [selectedTeamMemberId, setSelectedTeamMemberId] = React.useState<string>('');
  const [month, setMonth] = React.useState(() => new Date().getMonth() + 1);
  const [year, setYear] = React.useState(() => new Date().getFullYear());
  const [calendar, setCalendar] = React.useState<CalendarDayEntry[]>([]);
  const [pendingEdits, setPendingEdits] = React.useState<Map<string, DayEdit>>(new Map());

  // Loading and status states
  const [isLoadingVendors, setIsLoadingVendors] = React.useState(true);
  const [isLoadingTeamMembers, setIsLoadingTeamMembers] = React.useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Edit dialog state
  const [editingDay, setEditingDay] = React.useState<CalendarDayEntry | null>(null);
  const [editHours, setEditHours] = React.useState<string>('');
  const [editTimeOff, setEditTimeOff] = React.useState<TimeOffCode | ''>('');

  // Filtered team members for selected vendor
  const filteredTeamMembers = React.useMemo(() => {
    if (!selectedVendorId) return [];
    return teamMembers.filter((tm) => tm.vendorId === selectedVendorId);
  }, [teamMembers, selectedVendorId]);

  // Get current date for highlighting
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Check if there are unsaved changes
  const hasUnsavedChanges = pendingEdits.size > 0;

  // Fetch vendors on mount
  React.useEffect(() => {
    fetchVendors();
  }, []);

  // Fetch team members when vendor changes
  React.useEffect(() => {
    if (selectedVendorId) {
      fetchTeamMembers();
      setSelectedTeamMemberId(''); // Reset team member selection
    }
  }, [selectedVendorId]);

  // Fetch calendar when team member or month changes
  React.useEffect(() => {
    if (selectedTeamMemberId) {
      fetchCalendar();
      setPendingEdits(new Map()); // Reset pending edits
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamMemberId, month, year]);

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

  const fetchCalendar = async () => {
    try {
      setIsLoadingCalendar(true);
      const response = await fetch(
        `/api/timesheet-entries/calendar?teamMemberId=${selectedTeamMemberId}&month=${month}&year=${year}`
      );
      const data = await response.json();

      if (data.success) {
        setCalendar(data.data.calendar);
      } else {
        setError(data.error || 'Failed to fetch calendar');
      }
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
      setError('Failed to fetch calendar');
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setCalendar([]);
    setError(null);
    setSuccess(null);
  };

  const handleTeamMemberChange = (teamMemberId: string) => {
    setSelectedTeamMemberId(teamMemberId);
    setError(null);
    setSuccess(null);
  };

  const handlePreviousMonth = () => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    setMonth(prevMonth);
    setYear(prevYear);
  };

  const handleNextMonth = () => {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    setMonth(nextMonth);
    setYear(nextYear);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
  };

  const handleDayClick = (day: CalendarDayEntry) => {
    if (!day.date) return;

    // Get current value (pending edit or original entry)
    const pendingEdit = pendingEdits.get(day.date);
    const currentHours = pendingEdit?.hours ?? day.entry?.hours ?? null;
    const currentTimeOff = pendingEdit?.timeOffCode ?? day.entry?.timeOffCode ?? null;

    setEditingDay(day);
    setEditHours(currentHours !== null ? String(currentHours) : '');
    setEditTimeOff(currentTimeOff || '');
  };

  const handleEditSave = () => {
    if (!editingDay) return;

    const hours = editHours ? parseFloat(editHours) : null;
    const timeOffCode = editTimeOff || null;

    // Validate
    if (hours !== null && (hours < 0 || hours > 24)) {
      setError('Hours must be between 0 and 24');
      return;
    }

    // Add to pending edits
    setPendingEdits((prev) => {
      const next = new Map(prev);
      next.set(editingDay.date, {
        date: editingDay.date,
        hours,
        timeOffCode: timeOffCode as TimeOffCode | null,
      });
      return next;
    });

    setEditingDay(null);
    setEditHours('');
    setEditTimeOff('');
    setError(null);
  };

  const handleEditCancel = () => {
    setEditingDay(null);
    setEditHours('');
    setEditTimeOff('');
  };

  const handleSaveAll = async () => {
    if (!selectedTeamMemberId || pendingEdits.size === 0) return;

    try {
      setIsSaving(true);
      setError(null);

      const entries = Array.from(pendingEdits.values()).map((edit) => ({
        teamMemberId: selectedTeamMemberId,
        date: new Date(edit.date).toISOString(),
        hours: edit.hours,
        timeOffCode: edit.timeOffCode,
      }));

      const response = await fetch('/api/timesheet-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Changes saved successfully');
        setPendingEdits(new Map());
        await fetchCalendar();
        onDataChange?.();
      } else {
        setError(data.error || 'Failed to save changes');
      }
    } catch (err) {
      console.error('Failed to save changes:', err);
      setError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setPendingEdits(new Map());
    setSuccess(null);
  };

  // Get the effective value for a day (pending edit or original)
  const getDayValue = (day: CalendarDayEntry) => {
    const pending = pendingEdits.get(day.date);
    if (pending) {
      return {
        hours: pending.hours ?? undefined,
        timeOffCode: pending.timeOffCode ?? undefined,
        isPending: true,
      };
    }
    return {
      hours: day.entry?.hours,
      timeOffCode: day.entry?.timeOffCode,
      isPending: false,
    };
  };

  // Calculate stats
  const stats = React.useMemo(() => {
    let totalHours = 0;
    let workDays = 0;
    let unfilledWeekdays = 0;
    const timeOffCounts: Record<string, number> = {};

    for (const day of calendar) {
      if (!day.date) continue;

      const value = getDayValue(day);
      const dayDate = new Date(day.date);
      const isPastOrToday = dayDate <= today;

      if (value.hours) {
        totalHours += value.hours;
        workDays += value.hours / 8;
      }
      if (value.timeOffCode) {
        timeOffCounts[value.timeOffCode] = (timeOffCounts[value.timeOffCode] || 0) + 1;
        if (value.timeOffCode === 'HALF') {
          workDays += 0.5;
        } else {
          workDays += 1;
        }
      }

      // Count unfilled weekdays in the past
      if (!day.isWeekend && !value.hours && !value.timeOffCode && isPastOrToday) {
        unfilledWeekdays++;
      }
    }

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      workDays: Math.round(workDays * 100) / 100,
      timeOffCounts,
      unfilledWeekdays,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar, pendingEdits]);

  // Build calendar grid
  const calendarWeeks = React.useMemo(() => {
    if (!calendar || calendar.length === 0) return [];

    const weeks: CalendarDayEntry[][] = [];
    let currentWeek: CalendarDayEntry[] = [];

    // Get the first day's offset (padding for days before month starts)
    const firstDayOfWeek = calendar[0].dayOfWeek;

    // Add empty cells for days before the month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({
        date: '',
        dayOfWeek: i,
        isWeekend: i === 0 || i === 6,
      });
    }

    // Add all days of the month
    for (const day of calendar) {
      currentWeek.push(day);

      if (day.dayOfWeek === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add remaining days if the week isn't complete
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({
          date: '',
          dayOfWeek: currentWeek.length,
          isWeekend: currentWeek.length === 0 || currentWeek.length === 6,
        });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [calendar]);

  // Get selected vendor and team member names
  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);
  const selectedTeamMember = teamMembers.find((tm) => tm.id === selectedTeamMemberId);

  // Get time-off code styling
  const getTimeOffStyle = (code: TimeOffCode) => {
    const config = TIME_OFF_CODES.find((c) => c.value === code);
    return config?.color || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/15 p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Review
          </CardTitle>
          <CardDescription>
            Review and edit timesheet entries in a calendar view
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vendor Selection */}
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select
                value={selectedVendorId}
                onValueChange={handleVendorChange}
                disabled={isLoadingVendors}
              >
                <SelectTrigger data-testid="calendar-vendor-select">
                  <SelectValue placeholder="Select vendor..." />
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

            {/* Team Member Selection */}
            <div className="space-y-2">
              <Label>Team Member</Label>
              <Select
                value={selectedTeamMemberId}
                onValueChange={handleTeamMemberChange}
                disabled={!selectedVendorId || isLoadingTeamMembers}
              >
                <SelectTrigger data-testid="calendar-member-select">
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredTeamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
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
                  disabled={isLoadingCalendar || isSaving}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCurrentMonth}
                  disabled={isLoadingCalendar || isSaving}
                >
                  {MONTH_NAMES[month - 1]} {year}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  disabled={isLoadingCalendar || isSaving}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      {selectedTeamMemberId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedTeamMember?.firstName} {selectedTeamMember?.lastName}
                </CardTitle>
                <CardDescription>
                  Click on any day to edit the entry
                </CardDescription>
              </div>

              {/* Stats Summary */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>{stats.totalHours}h</span>
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4 text-green-500" />
                  <span>{stats.workDays}d</span>
                </div>
                {stats.unfilledWeekdays > 0 && (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{stats.unfilledWeekdays} unfilled</span>
                  </div>
                )}
                {Object.entries(stats.timeOffCounts).map(([code, count]) => (
                  <div key={code} className="flex items-center gap-1">
                    <Palmtree className="h-4 w-4 text-orange-500" />
                    <span>{code}: {count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingCalendar ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Calendar Grid */}
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {WEEKDAY_NAMES.map((day, index) => (
                        <div
                          key={day}
                          className={cn(
                            'text-center text-sm font-medium py-2',
                            (index === 0 || index === 6) && 'text-muted-foreground'
                          )}
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Weeks */}
                    {calendarWeeks.map((week, weekIndex) => (
                      <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
                        {week.map((day, dayIndex) => {
                          if (!day.date) {
                            return (
                              <div
                                key={`empty-${weekIndex}-${dayIndex}`}
                                className="min-h-[80px] bg-muted/20 rounded-md"
                              />
                            );
                          }

                          const value = getDayValue(day);
                          const dayNumber = new Date(day.date).getDate();
                          const isToday = day.date === todayStr;
                          const isFuture = new Date(day.date) > today;
                          const isUnfilled = !day.isWeekend && !value.hours && !value.timeOffCode && !isFuture;

                          return (
                            <div
                              key={day.date}
                              onClick={() => handleDayClick(day)}
                              className={cn(
                                'min-h-[80px] p-2 border rounded-md cursor-pointer transition-all',
                                'hover:border-primary hover:shadow-sm',
                                day.isWeekend ? 'bg-muted/40' : 'bg-background',
                                isToday && 'ring-2 ring-primary ring-offset-1',
                                value.isPending && 'border-yellow-400 bg-yellow-50/50',
                                isUnfilled && 'border-dashed border-yellow-400 bg-yellow-50/30'
                              )}
                              data-testid={`calendar-day-${day.date}`}
                            >
                              {/* Day Number */}
                              <div className={cn(
                                'text-sm font-medium mb-1',
                                day.isWeekend && 'text-muted-foreground',
                                isToday && 'text-primary font-bold'
                              )}>
                                {dayNumber}
                              </div>

                              {/* Entry Display */}
                              {value.hours !== undefined && (
                                <div className="flex items-center gap-1 text-xs bg-green-100 text-green-800 rounded px-1.5 py-0.5 mb-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{value.hours}h</span>
                                </div>
                              )}

                              {value.timeOffCode && (
                                <div className={cn(
                                  'text-xs rounded px-1.5 py-0.5 border',
                                  getTimeOffStyle(value.timeOffCode)
                                )}>
                                  {value.timeOffCode}
                                </div>
                              )}

                              {/* Pending indicator */}
                              {value.isPending && (
                                <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded ring-2 ring-primary" />
                    <span>Today</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded border-2 border-yellow-400 bg-yellow-50" />
                    <span>Pending changes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded border border-dashed border-yellow-400" />
                    <span>Unfilled workday</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-muted/40" />
                    <span>Weekend</span>
                  </div>
                </div>

                {/* Save/Discard Buttons */}
                {hasUnsavedChanges && (
                  <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={handleDiscardChanges}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Discard Changes
                    </Button>
                    <Button onClick={handleSaveAll} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save {pendingEdits.size} Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingDay} onOpenChange={(open) => !open && handleEditCancel()}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              Edit Entry: {editingDay && new Date(editingDay.date).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </DialogTitle>
            <DialogDescription>
              Enter hours worked or select a time-off code
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Hours Input */}
            <div className="space-y-2">
              <Label htmlFor="edit-hours">Hours Worked</Label>
              <Input
                id="edit-hours"
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={editHours}
                onChange={(e) => {
                  setEditHours(e.target.value);
                  if (e.target.value) setEditTimeOff(''); // Clear time-off if hours entered
                }}
                placeholder="Enter hours (0-24)"
              />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Time-off Selection */}
            <div className="space-y-2">
              <Label htmlFor="edit-timeoff">Time-Off Code</Label>
              <Select
                value={editTimeOff}
                onValueChange={(value) => {
                  setEditTimeOff(value as TimeOffCode);
                  if (value) setEditHours(''); // Clear hours if time-off selected
                }}
              >
                <SelectTrigger id="edit-timeoff">
                  <SelectValue placeholder="Select time-off type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Clear</SelectItem>
                  {TIME_OFF_CODES.map((code) => (
                    <SelectItem key={code.value} value={code.value}>
                      {code.value} - {code.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
