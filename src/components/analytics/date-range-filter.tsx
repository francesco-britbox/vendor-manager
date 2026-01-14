'use client';

import { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/card';

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onApply: () => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApply,
  onClear,
  isLoading,
}: DateRangeFilterProps) {
  const hasFilters = dateFrom || dateTo;

  // Quick filter presets
  const setQuickFilter = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    onDateFromChange(from.toISOString().split('T')[0]);
    onDateToChange(to.toISOString().split('T')[0]);
  };

  const setCurrentMonth = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    onDateFromChange(from.toISOString().split('T')[0]);
    onDateToChange(to.toISOString().split('T')[0]);
  };

  const setCurrentYear = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1);
    const to = new Date(now.getFullYear(), 11, 31);

    onDateFromChange(from.toISOString().split('T')[0]);
    onDateToChange(to.toISOString().split('T')[0]);
  };

  return (
    <Card className="mb-6" data-testid="date-range-filter">
      <CardContent className="py-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Date Range</span>
          </div>

          <div className="flex flex-wrap items-end gap-4 flex-1">
            <div className="space-y-1">
              <Label htmlFor="dateFrom" className="text-xs">From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="w-[150px]"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="dateTo" className="text-xs">To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="w-[150px]"
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onApply}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Apply'}
              </Button>

              {hasFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClear}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setQuickFilter(30)}
              className="text-xs"
            >
              Last 30 days
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setQuickFilter(90)}
              className="text-xs"
            >
              Last 90 days
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={setCurrentMonth}
              className="text-xs"
            >
              This Month
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={setCurrentYear}
              className="text-xs"
            >
              This Year
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
