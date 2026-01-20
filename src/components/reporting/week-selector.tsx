'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface WeekSelectorProps {
  selectedWeek: string;
  onWeekChange: (weekStart: string) => void;
  weeksToShow?: number;
}

/**
 * Get the Monday of the week containing the given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format a date as YYYY-MM-DD
 */
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a date for display
 */
function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function WeekSelector({
  selectedWeek,
  onWeekChange,
  weeksToShow = 8,
}: WeekSelectorProps) {
  const weeks = useMemo(() => {
    const result: Array<{ value: string; label: string; isCurrent: boolean }> = [];
    const today = new Date();
    const currentWeekStart = getWeekStart(today);

    for (let i = 0; i < weeksToShow; i++) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(weekStart.getDate() - i * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const value = formatDateString(weekStart);
      const isCurrent = i === 0;
      const label = isCurrent
        ? `This Week (${formatDisplayDate(weekStart)} - ${formatDisplayDate(weekEnd)})`
        : `Week of ${formatDisplayDate(weekStart)}`;

      result.push({ value, label, isCurrent });
    }

    return result;
  }, [weeksToShow]);

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedWeek} onValueChange={onWeekChange}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select week" />
        </SelectTrigger>
        <SelectContent>
          {weeks.map((week) => (
            <SelectItem key={week.value} value={week.value}>
              {week.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
