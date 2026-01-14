'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ContractForm } from './contract-form';
import type { ContractStatus } from '@/types';
import type { ContractWithVendor } from '@/lib/contracts';

interface ContractFormData {
  vendorId: string;
  title: string;
  startDate: string;
  endDate: string;
  value: number;
  currency: string;
  status: ContractStatus;
  documentUrl?: string;
}

interface ContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ContractFormData) => void;
  isLoading?: boolean;
  contract?: ContractWithVendor | null;
  vendors: Array<{ id: string; name: string }>;
  mode: 'create' | 'edit';
}

/**
 * Dialog component for creating or editing contracts
 */
export function ContractDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  contract,
  vendors,
  mode,
}: ContractDialogProps) {
  // Use wider dialog in edit mode to accommodate document upload and analysis
  const dialogWidth = mode === 'edit' && contract?.id ? 'sm:max-w-[700px]' : 'sm:max-w-[600px]';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogWidth} max-h-[90vh] overflow-y-auto`} data-testid="contract-dialog">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Contract' : 'Create New Contract'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the contract information below.'
              : 'Fill in the details to create a new contract.'}
          </DialogDescription>
        </DialogHeader>
        <ContractForm
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
          initialData={contract ?? undefined}
          vendors={vendors}
          mode={mode}
        />
      </DialogContent>
    </Dialog>
  );
}
