'use client';

import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarIcon, Edit3, HelpCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TimelineDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

// Valid patterns for flexible date input
const FLEXIBLE_DATE_PATTERNS = [
  /^TBC$/i,                                    // TBC
  /^Q[1-4]\s*\d{4}$/i,                        // Q1 2026, Q2 2026
  /^Q[1-4]$/i,                                 // Q1, Q2 (without year)
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{4}$/i, // Mar 2026
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{4}$/i, // March 2026
  /^H[1-2]\s*\d{4}$/i,                        // H1 2026, H2 2026
  /^(Early|Mid|Late|End of)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Q[1-4]|\d{4})/i, // Early 2026, End of Q1
  /^\d{4}$/,                                   // 2026 (year only)
];

function isValidFlexibleDate(value: string): boolean {
  if (!value.trim()) return false;
  return FLEXIBLE_DATE_PATTERNS.some((pattern) => pattern.test(value.trim()));
}

function tryParseDate(value: string): Date | null {
  // Try DD/MM/YYYY format
  const parsed = parse(value, 'dd/MM/yyyy', new Date());
  if (isValid(parsed)) return parsed;

  // Try DD/MM format (assume current year)
  const parsedShort = parse(value, 'dd/MM', new Date());
  if (isValid(parsedShort)) return parsedShort;

  return null;
}

function isCalendarDate(value: string): boolean {
  return tryParseDate(value) !== null;
}

export function TimelineDatePicker({
  value,
  onChange,
  disabled = false,
  className,
}: TimelineDatePickerProps) {
  const [isFlexibleMode, setIsFlexibleMode] = React.useState(() => {
    // Start in flexible mode if value doesn't look like a calendar date
    return value ? !isCalendarDate(value) : false;
  });
  const [flexibleValue, setFlexibleValue] = React.useState(value);
  const [flexibleError, setFlexibleError] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  // Sync flexible value when value prop changes
  React.useEffect(() => {
    if (isFlexibleMode) {
      setFlexibleValue(value);
    }
  }, [value, isFlexibleMode]);

  // Get the selected date for the calendar
  const selectedDate = React.useMemo(() => {
    return tryParseDate(value);
  }, [value]);

  // Handle calendar date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'dd/MM/yyyy'));
      setIsOpen(false);
    }
  };

  // Handle flexible input change
  const handleFlexibleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFlexibleValue(newValue);
    setFlexibleError(null);
  };

  // Validate and apply flexible input on blur
  const handleFlexibleBlur = () => {
    const trimmed = flexibleValue.trim();

    if (!trimmed) {
      onChange('');
      setFlexibleError(null);
      return;
    }

    if (isValidFlexibleDate(trimmed)) {
      onChange(trimmed);
      setFlexibleError(null);
    } else {
      setFlexibleError('Use formats like: TBC, Q1 2026, Mar 2026, H1 2026, Early 2026');
    }
  };

  // Toggle between modes
  const handleToggleMode = () => {
    const newMode = !isFlexibleMode;
    setIsFlexibleMode(newMode);
    setFlexibleError(null);

    if (newMode) {
      // Switching to flexible mode
      setFlexibleValue(value);
    } else {
      // Switching to calendar mode - clear if current value isn't a date
      if (!isCalendarDate(value)) {
        onChange('');
      }
    }
  };

  if (isFlexibleMode) {
    return (
      <div className={cn('flex gap-1', className)}>
        <div className="flex-1 relative">
          <Input
            value={flexibleValue}
            onChange={handleFlexibleChange}
            onBlur={handleFlexibleBlur}
            placeholder="TBC, Q1 2026, Mar 2026..."
            disabled={disabled}
            className={cn(
              'w-full pr-8',
              flexibleError && 'border-red-500 focus-visible:ring-red-500'
            )}
          />
          {flexibleError && (
            <p className="absolute -bottom-5 left-0 text-xs text-red-500 whitespace-nowrap">
              {flexibleError}
            </p>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                className="h-9 w-9 shrink-0 cursor-help"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-medium mb-1">Valid formats:</p>
              <ul className="text-xs space-y-0.5">
                <li>• TBC</li>
                <li>• Q1 2026, Q2, etc.</li>
                <li>• Mar 2026, January 2026</li>
                <li>• H1 2026, H2 2026</li>
                <li>• Early 2026, Mid Q1, End of Mar</li>
                <li>• 2026 (year only)</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleToggleMode}
                disabled={disabled}
                className="h-9 w-9 shrink-0"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Switch to calendar picker</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-1', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-[140px] justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value || 'Pick a date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate || undefined}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleToggleMode}
              disabled={disabled}
              className="h-9 w-9 shrink-0"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Switch to flexible date (TBC, Q1 2026, etc.)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
