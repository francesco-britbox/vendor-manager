'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InvoiceForm } from './invoice-form';
import type { InvoiceStatus } from '@/types';
import type { InvoiceWithVendor } from '@/lib/invoices';

interface InvoiceFormData {
  vendorId: string;
  invoiceNumber: string;
  invoiceDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  toleranceThreshold: number;
}

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InvoiceFormData) => void;
  isLoading?: boolean;
  invoice?: InvoiceWithVendor | null;
  vendors: Array<{ id: string; name: string }>;
  mode?: 'create' | 'edit';
}

/**
 * Dialog for creating or editing an invoice
 */
export function InvoiceDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  invoice,
  vendors,
  mode = 'create',
}: InvoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" data-testid="invoice-dialog">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Invoice' : 'Create Invoice'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the invoice details below'
              : 'Enter the details for the new invoice'}
          </DialogDescription>
        </DialogHeader>
        <InvoiceForm
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
          initialData={invoice ?? undefined}
          vendors={vendors}
          mode={mode}
        />
      </DialogContent>
    </Dialog>
  );
}
