'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { TimeOffCode } from '@/types';

interface TimesheetCellProps {
  date: string;
  isWeekend: boolean;
  hours?: number;
  timeOffCode?: TimeOffCode;
  onChange: (value: { hours?: number | null; timeOffCode?: TimeOffCode | null }) => void;
  disabled?: boolean;
}

const TIME_OFF_CODES: { value: TimeOffCode; label: string; shortLabel: string }[] = [
  { value: 'VAC', label: 'Vacation', shortLabel: 'VAC' },
  { value: 'HALF', label: 'Half Day', shortLabel: 'HALF' },
  { value: 'SICK', label: 'Sick Leave', shortLabel: 'SICK' },
  { value: 'MAT', label: 'Maternity Leave', shortLabel: 'MAT' },
  { value: 'CAS', label: 'Casual Leave', shortLabel: 'CAS' },
  { value: 'UNPAID', label: 'Unpaid Leave', shortLabel: 'UNPAID' },
];

/**
 * A single cell in the timesheet calendar
 * Supports entering hours or selecting a time-off code
 */
export function TimesheetCell({
  date,
  isWeekend,
  hours,
  timeOffCode,
  onChange,
  disabled = false,
}: TimesheetCellProps) {
  const [inputMode, setInputMode] = React.useState<'hours' | 'timeoff'>(
    timeOffCode ? 'timeoff' : 'hours'
  );
  const [localHours, setLocalHours] = React.useState<string>(
    hours !== undefined ? hours.toString() : ''
  );

  // Sync local state when props change
  React.useEffect(() => {
    if (timeOffCode) {
      setInputMode('timeoff');
      setLocalHours('');
    } else if (hours !== undefined) {
      setInputMode('hours');
      setLocalHours(hours.toString());
    } else {
      setLocalHours('');
    }
  }, [hours, timeOffCode]);

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalHours(value);

    // Only trigger onChange on valid input
    if (value === '') {
      onChange({ hours: null, timeOffCode: null });
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 24) {
        onChange({ hours: numValue, timeOffCode: null });
      }
    }
  };

  const handleHoursBlur = () => {
    // Clean up invalid values on blur
    if (localHours !== '' && (isNaN(parseFloat(localHours)) || parseFloat(localHours) < 0)) {
      setLocalHours('');
      onChange({ hours: null, timeOffCode: null });
    } else if (localHours !== '' && parseFloat(localHours) > 24) {
      setLocalHours('24');
      onChange({ hours: 24, timeOffCode: null });
    }
  };

  const handleTimeOffChange = (value: string) => {
    if (value === 'clear') {
      setInputMode('hours');
      onChange({ hours: null, timeOffCode: null });
    } else {
      onChange({ hours: null, timeOffCode: value as TimeOffCode });
    }
  };

  const handleCellClick = () => {
    if (inputMode === 'hours' && !disabled) {
      // Focus the input
    }
  };

  // Get day of month for display
  const dayNumber = new Date(date).getDate();

  return (
    <div
      className={cn(
        'min-h-[60px] p-1 border rounded-md relative group',
        isWeekend ? 'bg-muted/50' : 'bg-background',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onClick={handleCellClick}
      data-testid={`timesheet-cell-${date}`}
    >
      {/* Day number */}
      <div className="text-xs text-muted-foreground mb-1 font-medium">
        {dayNumber}
      </div>

      {/* Input area */}
      <div className="flex flex-col gap-1">
        {inputMode === 'hours' && !timeOffCode ? (
          <div className="relative">
            <Input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={localHours}
              onChange={handleHoursChange}
              onBlur={handleHoursBlur}
              disabled={disabled}
              placeholder="hrs"
              className={cn(
                'h-7 text-xs px-1 text-center',
                isWeekend && 'bg-muted/30'
              )}
              data-testid={`timesheet-hours-input-${date}`}
            />
            {/* Quick toggle to time-off mode */}
            {!disabled && localHours === '' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInputMode('timeoff');
                }}
                className="absolute right-0 top-0 h-7 px-1 text-[10px] text-muted-foreground hover:text-foreground"
                title="Switch to time-off"
              >
                TO
              </button>
            )}
          </div>
        ) : (
          <Select
            value={timeOffCode || ''}
            onValueChange={handleTimeOffChange}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn(
                'h-7 text-xs px-1',
                timeOffCode && 'bg-primary/10 text-primary font-medium'
              )}
              data-testid={`timesheet-timeoff-select-${date}`}
            >
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clear">Clear</SelectItem>
              {TIME_OFF_CODES.map((code) => (
                <SelectItem key={code.value} value={code.value}>
                  {code.shortLabel} - {code.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
