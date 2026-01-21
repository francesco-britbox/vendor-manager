'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, RefreshCw, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalogClock } from './analog-clock';
import { cn } from '@/lib/utils';
import type {
  TimezoneConfig,
  TimezoneData,
  WorldTimeAPIResponse,
  ClockState,
} from '@/types';
import { DEFAULT_TIMEZONE_CONFIGS } from '@/types';

interface MultiTimezoneClockCardProps {
  timezones?: TimezoneConfig[];
  className?: string;
}

// Cache duration: 1 hour in milliseconds
const CACHE_DURATION = 60 * 60 * 1000;
// API refresh interval: 1 hour
const API_REFRESH_INTERVAL = 60 * 60 * 1000;
// Clock tick interval: 1 second
const CLOCK_TICK_INTERVAL = 1000;

// In-memory cache for timezone data
const timezoneCache: Map<string, TimezoneData> = new Map();

function getTimeFromTimezoneData(data: TimezoneData): ClockState {
  // Use Intl.DateTimeFormat with the IANA timezone from API data
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: data.timezone,
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

function getTimeFromBrowser(timezone: string): ClockState {
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

function isCacheValid(data: TimezoneData): boolean {
  return Date.now() - data.cachedAt < CACHE_DURATION;
}

export function MultiTimezoneClockCard({
  timezones = DEFAULT_TIMEZONE_CONFIGS,
  className,
}: MultiTimezoneClockCardProps) {
  const [timezoneData, setTimezoneData] = useState<Map<string, TimezoneData>>(new Map());
  const [clockTimes, setClockTimes] = useState<Map<string, ClockState>>(new Map());
  const [isLoading, setIsLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch timezone data from WorldTimeAPI
  const fetchTimezoneData = useCallback(async (config: TimezoneConfig): Promise<TimezoneData | null> => {
    // Check cache first
    const cached = timezoneCache.get(config.id);
    if (cached && isCacheValid(cached)) {
      return cached;
    }

    try {
      const response = await fetch(
        `https://worldtimeapi.org/api/timezone/${config.apiArea}/${config.apiLocation}`,
        {
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const apiData: WorldTimeAPIResponse = await response.json();

      const data: TimezoneData = {
        timezone: apiData.timezone,
        datetime: apiData.datetime,
        utcOffset: apiData.utc_offset,
        abbreviation: apiData.abbreviation,
        dayOfWeek: apiData.day_of_week,
        unixtime: apiData.unixtime,
        cachedAt: Date.now(),
      };

      // Store in cache
      timezoneCache.set(config.id, data);

      return data;
    } catch {
      // Return null on error - will fallback to browser time
      return null;
    }
  }, []);

  // Fetch all timezone data
  const fetchAllTimezones = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) {
      setIsLoading(new Set(timezones.map(tz => tz.id)));
    }
    setIsRefreshing(true);

    const newTimezoneData = new Map<string, TimezoneData>();
    const newErrors = new Map<string, string>();

    // Fetch all timezones concurrently
    const results = await Promise.all(
      timezones.map(async (config) => {
        const data = await fetchTimezoneData(config);
        return { config, data };
      })
    );

    for (const { config, data } of results) {
      if (data) {
        newTimezoneData.set(config.id, data);
      } else {
        newErrors.set(config.id, 'Failed to fetch timezone data');
      }
    }

    setTimezoneData(newTimezoneData);
    setErrors(newErrors);
    setIsLoading(new Set());
    setIsRefreshing(false);
    setLastUpdate(new Date());
  }, [timezones, fetchTimezoneData]);

  // Update clock times every second
  const updateClockTimes = useCallback(() => {
    const newClockTimes = new Map<string, ClockState>();

    for (const config of timezones) {
      const data = timezoneData.get(config.id);

      if (data && isCacheValid(data)) {
        // Use API data with elapsed time calculation
        newClockTimes.set(config.id, getTimeFromTimezoneData(data));
      } else {
        // Fallback to browser time
        newClockTimes.set(config.id, getTimeFromBrowser(config.timezone));
      }
    }

    setClockTimes(newClockTimes);
  }, [timezones, timezoneData]);

  // Initial fetch
  useEffect(() => {
    fetchAllTimezones(true);
  }, [fetchAllTimezones]);

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
  }, [updateClockTimes]);

  // Set up API refresh interval (every hour)
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      fetchAllTimezones(false);
    }, API_REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchAllTimezones]);

  // Handle manual refresh
  const handleRefresh = () => {
    // Clear cache
    for (const config of timezones) {
      timezoneCache.delete(config.id);
    }
    fetchAllTimezones(false);
  };

  // Separate primary and secondary clocks
  const primaryClock = timezones.find(tz => tz.isPrimary) || timezones[0];
  const secondaryClocks = timezones.filter(tz => tz.id !== primaryClock.id);

  // Get clock state for a timezone
  const getClockState = (config: TimezoneConfig): ClockState => {
    return clockTimes.get(config.id) || { hours: 0, minutes: 0, seconds: 0 };
  };

  // Get abbreviation for a timezone
  const getAbbreviation = (config: TimezoneConfig): string => {
    const data = timezoneData.get(config.id);
    return data?.abbreviation || '';
  };

  // Check if loading
  const isClockLoading = (id: string): boolean => isLoading.has(id);

  // Check if has error
  const hasError = (id: string): boolean => errors.has(id);

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
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <Badge variant="outline" className="text-xs">
                Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8"
              title="Refresh timezone data"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Error banner if all clocks have errors */}
        {errors.size === timezones.length && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">
              Unable to fetch timezone data. Showing browser time as fallback.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          {/* Primary Clock */}
          <div className="flex-shrink-0">
            <AnalogClock
              time={getClockState(primaryClock)}
              label={primaryClock.label}
              abbreviation={getAbbreviation(primaryClock)}
              isPrimary={true}
              isLoading={isClockLoading(primaryClock.id)}
              hasError={hasError(primaryClock.id)}
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
                  isLoading={isClockLoading(config.id)}
                  hasError={hasError(config.id)}
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
                  <p className={cn(
                    'font-mono text-sm font-medium truncate',
                    hasError(config.id) && 'text-muted-foreground'
                  )}>
                    {isClockLoading(config.id) ? '--:--' : formatTime(time)}
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
