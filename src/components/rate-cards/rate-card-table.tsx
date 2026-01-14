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
import { Badge } from '@/components/ui/badge';
import { Trash2, Pencil, Building2, Briefcase, Calendar, History } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currency/currencies';
import type { RateCardWithDetails } from '@/lib/rate-cards';

interface RateCardTableProps {
  rateCards: RateCardWithDetails[];
  onEdit: (rateCard: RateCardWithDetails) => void;
  onDelete: (id: string) => void;
  onViewHistory?: (vendorId: string, roleId: string) => void;
  isDeleting?: string | null;
}

/**
 * Format a date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  }).format(d);
}

/**
 * Format a currency amount
 */
function formatCurrency(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Check if a rate card is currently active
 */
function isActive(effectiveFrom: Date | string, effectiveTo: Date | string | undefined | null): boolean {
  const now = new Date();
  const from = typeof effectiveFrom === 'string' ? new Date(effectiveFrom) : effectiveFrom;
  const to = effectiveTo ? (typeof effectiveTo === 'string' ? new Date(effectiveTo) : effectiveTo) : null;

  return from <= now && (to === null || to >= now);
}

/**
 * Check if a rate card is expired
 */
function isExpired(effectiveTo: Date | string | undefined | null): boolean {
  if (!effectiveTo) return false;
  const now = new Date();
  const to = typeof effectiveTo === 'string' ? new Date(effectiveTo) : effectiveTo;
  return to < now;
}

/**
 * Check if a rate card is scheduled for the future
 */
function isFuture(effectiveFrom: Date | string): boolean {
  const now = new Date();
  const from = typeof effectiveFrom === 'string' ? new Date(effectiveFrom) : effectiveFrom;
  return from > now;
}

/**
 * Get status badge for rate card
 */
function StatusBadge({ effectiveFrom, effectiveTo }: { effectiveFrom: Date | string; effectiveTo: Date | string | undefined | null }) {
  if (isFuture(effectiveFrom)) {
    return <Badge variant="secondary">Scheduled</Badge>;
  }
  if (isExpired(effectiveTo)) {
    return <Badge variant="outline" className="text-muted-foreground">Expired</Badge>;
  }
  if (isActive(effectiveFrom, effectiveTo)) {
    return <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/25">Active</Badge>;
  }
  return null;
}

/**
 * Table component for displaying rate cards
 */
export function RateCardTable({
  rateCards,
  onEdit,
  onDelete,
  onViewHistory,
  isDeleting,
}: RateCardTableProps) {
  if (rateCards.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center" data-testid="empty-rate-cards-message">
        <p className="text-muted-foreground">
          No rate cards configured yet. Add your first rate card above.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Daily Rate</TableHead>
            <TableHead>Effective Period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rateCards.map((rateCard) => (
            <TableRow key={rateCard.id} data-testid={`rate-card-row-${rateCard.id}`}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium" data-testid={`rate-card-vendor-${rateCard.id}`}>
                    {rateCard.vendor.name}
                  </span>
                  {rateCard.vendor.status === 'inactive' && (
                    <Badge variant="outline" className="text-xs">Inactive</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span data-testid={`rate-card-role-${rateCard.id}`}>{rateCard.role.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium" data-testid={`rate-card-rate-${rateCard.id}`}>
                {formatCurrency(rateCard.rate, rateCard.currency)}
                <span className="text-xs text-muted-foreground ml-1">{rateCard.currency}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatDate(rateCard.effectiveFrom)}
                    {rateCard.effectiveTo ? ` - ${formatDate(rateCard.effectiveTo)}` : ' - Ongoing'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge effectiveFrom={rateCard.effectiveFrom} effectiveTo={rateCard.effectiveTo} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(rateCard)}
                    disabled={isDeleting === rateCard.id}
                    data-testid={`edit-rate-card-${rateCard.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  {onViewHistory && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewHistory(rateCard.vendorId, rateCard.roleId)}
                      disabled={isDeleting === rateCard.id}
                      title="View rate history"
                    >
                      <History className="h-4 w-4" />
                      <span className="sr-only">View History</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(rateCard.id)}
                    disabled={isDeleting === rateCard.id}
                    title="Delete rate card"
                    data-testid={`delete-rate-card-${rateCard.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
