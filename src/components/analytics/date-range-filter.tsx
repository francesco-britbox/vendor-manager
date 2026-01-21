'use client';

import { Calendar, X, Building2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export interface Vendor {
  id: string;
  name: string;
}

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onApply: () => void;
  onClear: () => void;
  isLoading?: boolean;
  // Vendor filter props
  vendors?: Vendor[];
  selectedVendorId?: string;
  onVendorChange?: (vendorId: string) => void;
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onApply,
  onClear,
  isLoading,
  vendors = [],
  selectedVendorId = '',
  onVendorChange,
}: DateRangeFilterProps) {
  const hasFilters = dateFrom || dateTo || selectedVendorId;

  // Quick filter presets
  const setQuickFilter = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    onDateFromChange(from.toISOString().split('T')[0]);
    onDateToChange(to.toISOString().split('T')[0]);
  };

  const setLastMonth = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);

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

  // Build active filters summary
  const getActiveFiltersSummary = () => {
    const filters: string[] = [];
    if (dateFrom || dateTo) {
      if (dateFrom && dateTo) {
        filters.push(`${dateFrom} to ${dateTo}`);
      } else if (dateFrom) {
        filters.push(`From ${dateFrom}`);
      } else if (dateTo) {
        filters.push(`To ${dateTo}`);
      }
    }
    if (selectedVendorId) {
      const vendor = vendors.find(v => v.id === selectedVendorId);
      if (vendor) {
        filters.push(vendor.name);
      }
    }
    return filters;
  };

  const activeFiltersSummary = getActiveFiltersSummary();

  return (
    <Card className="mb-6" data-testid="date-range-filter">
      <CardContent className="py-4">
        <div className="space-y-4">
          {/* Filter Header with Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
              {activeFiltersSummary.length > 0 && (
                <div className="flex items-center gap-1 ml-2">
                  {activeFiltersSummary.map((filter, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {filter}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Date Range Section */}
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

              {/* Vendor Filter */}
              {onVendorChange && (
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Vendor
                  </Label>
                  <Select
                    value={selectedVendorId || 'all'}
                    onValueChange={(value) => onVendorChange(value === 'all' ? '' : value)}
                  >
                    <SelectTrigger className="w-[200px]" data-testid="vendor-filter">
                      <SelectValue placeholder="All vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All vendors</SelectItem>
                      {vendors.length === 0 ? (
                        <SelectItem value="no-vendors" disabled>
                          No vendors available
                        </SelectItem>
                      ) : (
                        vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

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
                onClick={setLastMonth}
                className="text-xs"
              >
                Last Month
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
        </div>
      </CardContent>
    </Card>
  );
}
