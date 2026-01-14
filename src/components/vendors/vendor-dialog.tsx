'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VendorForm } from './vendor-form';
import type { Vendor, VendorStatus } from '@/types';

interface VendorFormData {
  name: string;
  address?: string;
  location?: string;
  serviceDescription?: string;
  status: VendorStatus;
}

interface VendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: VendorFormData) => void;
  isLoading?: boolean;
  vendor?: Vendor | null;
  mode: 'create' | 'edit';
}

/**
 * Dialog component for creating or editing vendors
 */
export function VendorDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  vendor,
  mode,
}: VendorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" data-testid="vendor-dialog">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Vendor' : 'Create New Vendor'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the vendor information below.'
              : 'Fill in the details to create a new vendor.'}
          </DialogDescription>
        </DialogHeader>
        <VendorForm
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
          initialData={vendor ?? undefined}
          mode={mode}
        />
      </DialogContent>
    </Dialog>
  );
}
