'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Trash2,
  Edit,
  Eye,
  FileText,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileQuestion,
} from 'lucide-react';
import type { ContractStatus } from '@/types';
import type { ContractWithVendor } from '@/lib/contracts';
import { ComponentGuard } from '@/components/permissions/rbac-guard';

interface ContractTableProps {
  contracts: ContractWithVendor[];
  onView?: (contract: ContractWithVendor) => void;
  onEdit?: (contract: ContractWithVendor) => void;
  onDelete?: (id: string) => void;
  isDeleting?: string | null;
}

/**
 * Format a date for display
 */
function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  }).format(new Date(date));
}

/**
 * Format currency value
 */
function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Get status badge styling and icon
 */
function getStatusBadge(status: ContractStatus): {
  className: string;
  icon: React.ReactNode;
  label: string;
} {
  switch (status) {
    case 'draft':
      return {
        className: 'bg-gray-100 text-gray-700',
        icon: <FileQuestion className="h-3 w-3" />,
        label: 'Draft',
      };
    case 'active':
      return {
        className: 'bg-green-100 text-green-700',
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Active',
      };
    case 'expired':
      return {
        className: 'bg-amber-100 text-amber-700',
        icon: <Clock className="h-3 w-3" />,
        label: 'Expired',
      };
    case 'terminated':
      return {
        className: 'bg-red-100 text-red-700',
        icon: <XCircle className="h-3 w-3" />,
        label: 'Terminated',
      };
    default:
      return {
        className: 'bg-gray-100 text-gray-700',
        icon: null,
        label: status,
      };
  }
}

/**
 * Get expiration countdown display
 */
function getExpirationDisplay(contract: ContractWithVendor): React.ReactNode {
  if (contract.status === 'terminated' || contract.status === 'draft') {
    return <span className="text-muted-foreground">-</span>;
  }

  const days = contract.daysUntilExpiration ?? 0;

  if (days < 0) {
    return (
      <span className="flex items-center gap-1 text-red-600 font-medium">
        <AlertTriangle className="h-3 w-3" />
        Expired {Math.abs(days)} days ago
      </span>
    );
  }

  if (days === 0) {
    return (
      <span className="flex items-center gap-1 text-red-600 font-medium">
        <AlertTriangle className="h-3 w-3" />
        Expires today
      </span>
    );
  }

  if (days <= 30) {
    return (
      <span className="flex items-center gap-1 text-amber-600 font-medium">
        <Clock className="h-3 w-3" />
        {days} days remaining
      </span>
    );
  }

  return (
    <span className="text-muted-foreground">
      {days} days remaining
    </span>
  );
}

/**
 * Table component for displaying contracts
 */
export function ContractTable({
  contracts,
  onView,
  onEdit,
  onDelete,
  isDeleting,
}: ContractTableProps) {
  if (contracts.length === 0) {
    return (
      <div
        className="rounded-md border p-8 text-center"
        data-testid="contract-table-empty"
      >
        <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">
          No contracts found. Create your first contract to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border" data-testid="contract-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => {
            const statusBadge = getStatusBadge(contract.status);
            return (
              <TableRow key={contract.id} data-testid={`contract-row-${contract.id}`}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span data-testid={`contract-title-${contract.id}`}>
                      {contract.title}
                    </span>
                    {/* Show uploaded document link */}
                    {contract.documentKey && (
                      <a
                        href={`/api/contracts/${contract.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                        data-testid={`contract-document-${contract.id}`}
                      >
                        <FileText className="h-3 w-3" />
                        {contract.documentName || 'View Document'}
                      </a>
                    )}
                    {/* Show external URL if no uploaded document */}
                    {!contract.documentKey && contract.documentUrl && (
                      <a
                        href={contract.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        External Document
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/vendors/${contract.vendorId}`}
                    className="hover:underline text-sm"
                  >
                    {contract.vendor.name}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(contract.value, contract.currency)}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusBadge.className}`}
                    data-testid={`contract-status-${contract.id}`}
                  >
                    {statusBadge.icon}
                    {statusBadge.label}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">
                      {formatDate(contract.startDate)}
                    </span>
                    <span className="text-xs">to</span>
                    <span className="text-muted-foreground">
                      {formatDate(contract.endDate)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {getExpirationDisplay(contract)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {onView && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(contract)}
                        data-testid={`view-contract-${contract.id}`}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(contract)}
                        data-testid={`edit-contract-${contract.id}`}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    )}
                    {onDelete && (
                      <ComponentGuard componentKey="contract-delete">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(contract.id)}
                          disabled={isDeleting === contract.id}
                          data-testid={`delete-contract-${contract.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </ComponentGuard>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
