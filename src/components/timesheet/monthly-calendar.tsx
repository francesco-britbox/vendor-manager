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
import { TimesheetCell } from './timesheet-cell';
import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeOffCode } from '@/types';

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

interface PendingChange {
  date: string;
  hours?: number | null;
  timeOffCode?: TimeOffCode | null;
}

interface MonthlyCalendarProps {
  teamMemberId: string;
  teamMemberName: string;
  calendar: CalendarDayEntry[];
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
  onSave: (entries: { date: string; hours?: number | null; timeOffCode?: TimeOffCode | null }[]) => Promise<void>;
  isLoading?: boolean;
  isSaving?: boolean;
  disabled?: boolean;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Monthly calendar view for timesheet entry
 */
export function MonthlyCalendar({
  teamMemberId,
  teamMemberName,
  calendar,
  month,
  year,
  onMonthChange,
  onSave,
  isLoading = false,
  isSaving = false,
  disabled = false,
}: MonthlyCalendarProps) {
  const [pendingChanges, setPendingChanges] = React.useState<Map<string, PendingChange>>(
    new Map()
  );

  // Reset pending changes when team member or month changes
  React.useEffect(() => {
    setPendingChanges(new Map());
  }, [teamMemberId, month, year]);

  // Calculate weeks for the calendar grid
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

  const handleCellChange = (
    date: string,
    value: { hours?: number | null; timeOffCode?: TimeOffCode | null }
  ) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(date, { date, ...value });
      return next;
    });
  };

  const handleSave = async () => {
    if (pendingChanges.size === 0) return;

    const entries = Array.from(pendingChanges.values());
    await onSave(entries);
    setPendingChanges(new Map());
  };

  const handlePreviousMonth = () => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    onMonthChange(prevMonth, prevYear);
  };

  const handleNextMonth = () => {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    onMonthChange(nextMonth, nextYear);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    onMonthChange(now.getMonth() + 1, now.getFullYear());
  };

  // Get the effective value for a cell (pending change or original)
  const getCellValue = (day: CalendarDayEntry) => {
    const pending = pendingChanges.get(day.date);
    if (pending) {
      return {
        hours: pending.hours ?? undefined,
        timeOffCode: pending.timeOffCode ?? undefined,
      };
    }
    return {
      hours: day.entry?.hours,
      timeOffCode: day.entry?.timeOffCode,
    };
  };

  // Calculate summary stats
  const stats = React.useMemo(() => {
    let totalHours = 0;
    let workDays = 0;
    const timeOffCounts: Record<string, number> = {};

    for (const day of calendar) {
      if (!day.date) continue;

      const value = getCellValue(day);
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
    }

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      workDays: Math.round(workDays * 100) / 100,
      timeOffCounts,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar, pendingChanges]);

  const hasUnsavedChanges = pendingChanges.size > 0;

  return (
    <Card data-testid="monthly-calendar">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">
              Timesheet: {teamMemberName}
            </CardTitle>
            <CardDescription>
              Enter daily hours or select time-off codes
            </CardDescription>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              disabled={isLoading || isSaving}
              data-testid="prev-month-button"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleCurrentMonth}
              disabled={isLoading || isSaving}
              className="min-w-[140px]"
              data-testid="current-month-display"
            >
              {MONTH_NAMES[month - 1]} {year}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              disabled={isLoading || isSaving}
              data-testid="next-month-button"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="flex flex-wrap gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
              <div className="text-sm">
                <span className="text-muted-foreground">Total Hours:</span>{' '}
                <span className="font-semibold" data-testid="total-hours">
                  {stats.totalHours}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Work Days:</span>{' '}
                <span className="font-semibold" data-testid="work-days">
                  {stats.workDays}
                </span>
              </div>
              {Object.entries(stats.timeOffCounts).map(([code, count]) => (
                <div key={code} className="text-sm">
                  <span className="text-muted-foreground">{code}:</span>{' '}
                  <span className="font-semibold">{count} days</span>
                </div>
              ))}
            </div>

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
                    {week.map((day, dayIndex) => (
                      <div key={day.date || `empty-${weekIndex}-${dayIndex}`}>
                        {day.date ? (
                          <TimesheetCell
                            date={day.date}
                            isWeekend={day.isWeekend}
                            hours={getCellValue(day).hours}
                            timeOffCode={getCellValue(day).timeOffCode}
                            onChange={(value) => handleCellChange(day.date, value)}
                            disabled={disabled || isSaving}
                          />
                        ) : (
                          <div className="min-h-[60px] bg-muted/20 rounded-md" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-4">
              <Button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving || disabled}
                data-testid="save-timesheet-button"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                    {hasUnsavedChanges && (
                      <span className="ml-2 text-xs bg-primary-foreground/20 px-1.5 py-0.5 rounded">
                        {pendingChanges.size}
                      </span>
                    )}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
