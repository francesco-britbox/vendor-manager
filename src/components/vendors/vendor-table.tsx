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
import { Trash2, Edit, Eye, MapPin, Building2 } from 'lucide-react';
import type { Vendor } from '@/types';

interface VendorTableProps {
  vendors: Vendor[];
  onView?: (vendor: Vendor) => void;
  onEdit?: (vendor: Vendor) => void;
  onDelete?: (id: string) => void;
  isDeleting?: string | null;
}

/**
 * Format a date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  }).format(new Date(date));
}

/**
 * Table component for displaying vendors
 */
export function VendorTable({
  vendors,
  onView,
  onEdit,
  onDelete,
  isDeleting,
}: VendorTableProps) {
  if (vendors.length === 0) {
    return (
      <div
        className="rounded-md border p-8 text-center"
        data-testid="vendor-table-empty"
      >
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">
          No vendors found. Create your first vendor to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border" data-testid="vendor-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((vendor) => (
            <TableRow key={vendor.id} data-testid={`vendor-row-${vendor.id}`}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <Link
                    href={`/vendors/${vendor.id}`}
                    className="hover:underline"
                    data-testid={`vendor-name-${vendor.id}`}
                  >
                    {vendor.name}
                  </Link>
                  {vendor.serviceDescription && (
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {vendor.serviceDescription}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {vendor.location ? (
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>{vendor.location}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    vendor.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                  data-testid={`vendor-status-${vendor.id}`}
                >
                  {vendor.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(vendor.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {onView && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onView(vendor)}
                      data-testid={`view-vendor-${vendor.id}`}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(vendor)}
                      data-testid={`edit-vendor-${vendor.id}`}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(vendor.id)}
                      disabled={isDeleting === vendor.id}
                      data-testid={`delete-vendor-${vendor.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
