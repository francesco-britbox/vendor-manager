'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, Clock } from 'lucide-react';
import { formatCurrencyLabel } from '@/lib/currency';
import type { ExchangeRateWithMeta } from '@/lib/currency';
import { ComponentGuard } from '@/components/permissions/rbac-guard';

interface ExchangeRateTableProps {
  rates: ExchangeRateWithMeta[];
  onDelete: (id: string) => void;
  isDeleting?: string | null;
}

/**
 * Format a date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

/**
 * Format duration in hours for display
 */
function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes ago`;
  }
  if (hours < 24) {
    return `${Math.round(hours)} hours ago`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Table component for displaying exchange rates with timestamp tracking
 */
export function ExchangeRateTable({
  rates,
  onDelete,
  isDeleting,
}: ExchangeRateTableProps) {
  if (rates.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">
          No exchange rates configured yet. Add your first exchange rate above.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map(rate => (
            <TableRow key={rate.id} data-testid={`rate-row-${rate.fromCurrency}-${rate.toCurrency}`}>
              <TableCell className="font-medium">
                {formatCurrencyLabel(rate.fromCurrency)}
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrencyLabel(rate.toCurrency)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {rate.rate.toFixed(6)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm">{formatDate(rate.lastUpdated)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(rate.staleDurationHours)}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {rate.isStale ? (
                  <div className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs">Stale</span>
                  </div>
                ) : (
                  <span className="text-xs text-green-600">Current</span>
                )}
              </TableCell>
              <TableCell>
                <ComponentGuard componentKey="exchange-rate-delete">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(rate.id)}
                    disabled={isDeleting === rate.id}
                    data-testid={`delete-rate-${rate.fromCurrency}-${rate.toCurrency}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </ComponentGuard>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
