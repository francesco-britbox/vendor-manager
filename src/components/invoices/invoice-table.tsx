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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Calculator,
} from 'lucide-react';
import type { InvoiceWithVendor } from '@/lib/invoices';

interface InvoiceTableProps {
  invoices: InvoiceWithVendor[];
  onEdit: (invoice: InvoiceWithVendor) => void;
  onDelete: (id: string) => void;
  onValidate: (id: string) => void;
  isDeleting?: string | null;
  isValidating?: string | null;
}

/**
 * Format currency value with proper formatting
 */
function formatCurrency(value: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get badge variant for invoice status
 */
function getStatusBadge(status: string): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  label: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case 'pending':
      return {
        variant: 'secondary',
        label: 'Pending',
        icon: <Clock className="h-3 w-3 mr-1" />,
      };
    case 'validated':
      return {
        variant: 'default',
        label: 'Validated',
        icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
      };
    case 'disputed':
      return {
        variant: 'destructive',
        label: 'Disputed',
        icon: <AlertTriangle className="h-3 w-3 mr-1" />,
      };
    case 'paid':
      return {
        variant: 'outline',
        label: 'Paid',
        icon: <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />,
      };
    default:
      return {
        variant: 'secondary',
        label: status,
        icon: null,
      };
  }
}

/**
 * Get validation status badge
 */
function getValidationStatusBadge(
  validationStatus: string | undefined,
  discrepancyPercentage: number | undefined
): React.ReactNode | null {
  if (!validationStatus || validationStatus === 'not_validated') {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Not validated
      </Badge>
    );
  }

  if (validationStatus === 'within_tolerance') {
    return (
      <Badge variant="default" className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Within tolerance
        {discrepancyPercentage !== undefined && (
          <span className="ml-1">({discrepancyPercentage.toFixed(1)}%)</span>
        )}
      </Badge>
    );
  }

  if (validationStatus === 'exceeds_tolerance') {
    return (
      <Badge variant="destructive" className="text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Exceeds tolerance
        {discrepancyPercentage !== undefined && (
          <span className="ml-1">({discrepancyPercentage.toFixed(1)}%)</span>
        )}
      </Badge>
    );
  }

  return null;
}

/**
 * Table displaying invoices with actions
 */
export function InvoiceTable({
  invoices,
  onEdit,
  onDelete,
  onValidate,
  isDeleting,
  isValidating,
}: InvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-12" data-testid="invoice-table-empty">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No invoices found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Get started by creating your first invoice
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden" data-testid="invoice-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Billing Period</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Expected</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Validation</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const statusBadge = getStatusBadge(invoice.status);
            const isCurrentDeleting = isDeleting === invoice.id;
            const isCurrentValidating = isValidating === invoice.id;

            return (
              <TableRow
                key={invoice.id}
                data-testid={`invoice-row-${invoice.id}`}
                className={
                  invoice.validationStatus === 'exceeds_tolerance'
                    ? 'bg-red-50'
                    : undefined
                }
              >
                <TableCell className="font-medium">
                  {invoice.invoiceNumber}
                </TableCell>
                <TableCell>{invoice.vendor.name}</TableCell>
                <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                <TableCell className="text-sm">
                  {formatDate(invoice.billingPeriodStart)} -{' '}
                  {formatDate(invoice.billingPeriodEnd)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </TableCell>
                <TableCell className="text-right">
                  {invoice.expectedAmount !== undefined ? (
                    <span
                      className={
                        invoice.validationStatus === 'exceeds_tolerance'
                          ? 'text-red-600 font-medium'
                          : 'text-muted-foreground'
                      }
                    >
                      {formatCurrency(invoice.expectedAmount, invoice.currency)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadge.variant} className="text-xs">
                    {statusBadge.icon}
                    {statusBadge.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getValidationStatusBadge(
                    invoice.validationStatus,
                    invoice.discrepancyPercentage
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isCurrentDeleting || isCurrentValidating}
                        data-testid={`invoice-actions-${invoice.id}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onValidate(invoice.id)}
                        disabled={isCurrentValidating}
                        data-testid={`invoice-validate-${invoice.id}`}
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        {isCurrentValidating ? 'Validating...' : 'Validate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onEdit(invoice)}
                        data-testid={`invoice-edit-${invoice.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(invoice.id)}
                        disabled={isCurrentDeleting}
                        className="text-destructive focus:text-destructive"
                        data-testid={`invoice-delete-${invoice.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isCurrentDeleting ? 'Deleting...' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
