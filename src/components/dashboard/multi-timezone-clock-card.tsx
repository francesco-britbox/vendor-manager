'use client';

import { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AnalogClock } from './analog-clock';
import { cn } from '@/lib/utils';
import type { TimezoneConfig, ClockState } from '@/types';
import { DEFAULT_TIMEZONE_CONFIGS } from '@/types';

interface MultiTimezoneClockCardProps {
  timezones?: TimezoneConfig[];
  className?: string;
}

// Clock tick interval: 1 second
const CLOCK_TICK_INTERVAL = 1000;

/**
 * Get current time for a timezone using browser's Intl API
 * This is accurate, handles DST automatically, and works offline
 */
function getTimeForTimezone(timezone: string): ClockState {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const seconds = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);

  return { hours, minutes, seconds };
}

/**
 * Get timezone abbreviation using browser's Intl API
 * Returns abbreviations like GMT, EST, IST, etc.
 */
function getTimezoneAbbreviation(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  });

  const parts = formatter.formatToParts(now);
  return parts.find(p => p.type === 'timeZoneName')?.value || '';
}

export function MultiTimezoneClockCard({
  timezones = DEFAULT_TIMEZONE_CONFIGS,
  className,
}: MultiTimezoneClockCardProps) {
  const [clockTimes, setClockTimes] = useState<Map<string, ClockState>>(new Map());
  const [abbreviations, setAbbreviations] = useState<Map<string, string>>(new Map());
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update all clock times
  const updateClockTimes = () => {
    const newClockTimes = new Map<string, ClockState>();
    for (const config of timezones) {
      newClockTimes.set(config.id, getTimeForTimezone(config.timezone));
    }
    setClockTimes(newClockTimes);
  };

  // Initialize abbreviations (only need to do this once, or when DST changes)
  useEffect(() => {
    const newAbbreviations = new Map<string, string>();
    for (const config of timezones) {
      newAbbreviations.set(config.id, getTimezoneAbbreviation(config.timezone));
    }
    setAbbreviations(newAbbreviations);
  }, [timezones]);

  // Set up clock tick interval
  useEffect(() => {
    // Update immediately
    updateClockTimes();

    // Then update every second
    tickIntervalRef.current = setInterval(updateClockTimes, CLOCK_TICK_INTERVAL);

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezones]);

  // Separate primary and secondary clocks
  const primaryClock = timezones.find(tz => tz.isPrimary) || timezones[0];
  const secondaryClocks = timezones.filter(tz => tz.id !== primaryClock.id);

  // Get clock state for a timezone
  const getClockState = (config: TimezoneConfig): ClockState => {
    return clockTimes.get(config.id) || { hours: 0, minutes: 0, seconds: 0 };
  };

  // Get abbreviation for a timezone
  const getAbbreviation = (config: TimezoneConfig): string => {
    return abbreviations.get(config.id) || '';
  };

  return (
    <Card className={cn('col-span-full lg:col-span-2', className)} data-testid="multi-timezone-clock-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              World Clock
            </CardTitle>
            <CardDescription>
              Current time across global timezones
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          {/* Primary Clock */}
          <div className="flex-shrink-0">
            <AnalogClock
              time={getClockState(primaryClock)}
              label={primaryClock.label}
              abbreviation={getAbbreviation(primaryClock)}
              isPrimary={true}
              isLoading={false}
              hasError={false}
            />
          </div>

          {/* Secondary Clocks Grid */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 justify-items-center">
              {secondaryClocks.map((config) => (
                <AnalogClock
                  key={config.id}
                  time={getClockState(config)}
                  label={config.label}
                  abbreviation={getAbbreviation(config)}
                  isPrimary={false}
                  isLoading={false}
                  hasError={false}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Digital time display */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-5 gap-2 text-center">
            {[primaryClock, ...secondaryClocks].map((config) => {
              const time = getClockState(config);
              const formatTime = (t: ClockState) =>
                `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}`;

              return (
                <div key={config.id} className="min-w-0">
                  <p className="font-mono text-sm font-medium truncate">
                    {formatTime(time)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {config.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
