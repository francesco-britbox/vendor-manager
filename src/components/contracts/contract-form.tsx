'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentUpload, type DocumentInfo } from './document-upload';
import { ContractAnalysisDisplay } from './contract-analysis-display';
import type { ContractStatus, ContractAnalysis } from '@/types';
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

interface ContractFormProps {
  onSubmit: (data: ContractFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<ContractWithVendor>;
  vendors: Array<{ id: string; name: string }>;
  mode?: 'create' | 'edit';
  /** Called when document is uploaded/deleted - for refreshing data */
  onDocumentChange?: () => void;
}

/**
 * Format a date for input field (YYYY-MM-DD)
 */
function formatDateForInput(date: Date | string | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Form for creating or editing contracts
 */
export function ContractForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  vendors,
  mode = 'create',
  onDocumentChange,
}: ContractFormProps) {
  const [vendorId, setVendorId] = React.useState(initialData?.vendorId ?? '');
  const [title, setTitle] = React.useState(initialData?.title ?? '');
  const [startDate, setStartDate] = React.useState(
    formatDateForInput(initialData?.startDate)
  );
  const [endDate, setEndDate] = React.useState(
    formatDateForInput(initialData?.endDate)
  );
  const [value, setValue] = React.useState<string>(
    initialData?.value?.toString() ?? ''
  );
  const [currency, setCurrency] = React.useState(initialData?.currency ?? 'GBP');
  const [status, setStatus] = React.useState<ContractStatus>(
    initialData?.status ?? 'draft'
  );
  const [documentUrl, setDocumentUrl] = React.useState(
    initialData?.documentUrl ?? ''
  );
  const [error, setError] = React.useState<string | null>(null);

  // Update form when initialData changes (for edit mode)
  React.useEffect(() => {
    if (initialData) {
      setVendorId(initialData.vendorId ?? '');
      setTitle(initialData.title ?? '');
      setStartDate(formatDateForInput(initialData.startDate));
      setEndDate(formatDateForInput(initialData.endDate));
      setValue(initialData.value?.toString() ?? '');
      setCurrency(initialData.currency ?? 'GBP');
      setStatus(initialData.status ?? 'draft');
      setDocumentUrl(initialData.documentUrl ?? '');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!vendorId) {
      setError('Please select a vendor');
      return;
    }

    if (!title.trim()) {
      setError('Contract title is required');
      return;
    }

    if (title.length > 255) {
      setError('Contract title must be at most 255 characters');
      return;
    }

    if (!startDate) {
      setError('Start date is required');
      return;
    }

    if (!endDate) {
      setError('End date is required');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      setError('End date must be after or equal to start date');
      return;
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue < 0) {
      setError('Value must be a valid positive number');
      return;
    }

    if (!currency || currency.length !== 3) {
      setError('Currency must be a valid 3-letter code');
      return;
    }

    if (documentUrl && documentUrl.trim()) {
      try {
        new URL(documentUrl);
      } catch {
        setError('Document URL must be a valid URL');
        return;
      }
    }

    onSubmit({
      vendorId,
      title: title.trim(),
      startDate,
      endDate,
      value: numericValue,
      currency: currency.toUpperCase(),
      status,
      documentUrl: documentUrl.trim() || undefined,
    });
  };

  // Common currency options
  const currencies = ['GBP', 'USD', 'EUR', 'AUD', 'CAD', 'CHF', 'JPY'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="contract-form">
      <div className="space-y-2">
        <Label htmlFor="vendorId">
          Vendor <span className="text-destructive">*</span>
        </Label>
        <Select
          value={vendorId}
          onValueChange={setVendorId}
          disabled={isLoading}
        >
          <SelectTrigger data-testid="contract-vendor-select">
            <SelectValue placeholder="Select a vendor" />
          </SelectTrigger>
          <SelectContent>
            {vendors.map((vendor) => (
              <SelectItem key={vendor.id} value={vendor.id}>
                {vendor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">
          Contract Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          type="text"
          placeholder="Enter contract title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="contract-title-input"
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">
            Start Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            data-testid="contract-start-date-input"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">
            End Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            data-testid="contract-end-date-input"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value">
            Contract Value <span className="text-destructive">*</span>
          </Label>
          <Input
            id="value"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="contract-value-input"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">
            Currency <span className="text-destructive">*</span>
          </Label>
          <Select
            value={currency}
            onValueChange={setCurrency}
            disabled={isLoading}
          >
            <SelectTrigger data-testid="contract-currency-select">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((curr) => (
                <SelectItem key={curr} value={curr}>
                  {curr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={status}
          onValueChange={(value: ContractStatus) => setStatus(value)}
          disabled={isLoading}
        >
          <SelectTrigger data-testid="contract-status-select">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document Upload Section - Only visible in edit mode when contract has an ID */}
      {mode === 'edit' && initialData?.id && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Contract Document</Label>
            <DocumentUpload
              contractId={initialData.id}
              initialDocument={{
                documentKey: initialData.documentKey,
                documentName: initialData.documentName,
                documentSize: initialData.documentSize,
                documentType: initialData.documentType,
                documentUploadedAt: initialData.documentUploadedAt,
              }}
              onUploadSuccess={() => {
                onDocumentChange?.();
              }}
              onDeleteSuccess={() => {
                onDocumentChange?.();
              }}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Upload a PDF or Word document (max 25MB)
            </p>
          </div>

          {/* AI Analysis Section */}
          <ContractAnalysisDisplay
            contractId={initialData.id}
            hasDocument={!!initialData.documentKey}
            initialAnalysis={initialData.aiAnalysis || null}
            compact={true}
          />
        </div>
      )}

      {/* Show Document URL field for create mode or external URLs */}
      {(mode === 'create' || (!initialData?.documentKey && documentUrl)) && (
        <div className="space-y-2">
          <Label htmlFor="documentUrl">
            {mode === 'create' ? 'External Document URL (optional)' : 'Document URL'}
          </Label>
          <Input
            id="documentUrl"
            type="url"
            placeholder="https://example.com/document.pdf"
            value={documentUrl}
            onChange={(e) => setDocumentUrl(e.target.value)}
            data-testid="contract-document-url-input"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            {mode === 'create'
              ? 'Optional link to an external document. You can upload documents after saving.'
              : 'Optional link to the contract document'}
          </p>
        </div>
      )}

      {error && (
        <div
          className="rounded-md bg-destructive/15 p-3 text-sm text-destructive"
          data-testid="contract-form-error"
        >
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="contract-form-cancel"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading} data-testid="contract-form-submit">
          {isLoading
            ? 'Saving...'
            : mode === 'edit'
            ? 'Update Contract'
            : 'Create Contract'}
        </Button>
      </div>
    </form>
  );
}
