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

interface InvoiceFormProps {
  onSubmit: (data: InvoiceFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<InvoiceWithVendor>;
  vendors: Array<{ id: string; name: string }>;
  mode?: 'create' | 'edit';
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
 * Form for creating or editing invoices
 */
export function InvoiceForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  vendors,
  mode = 'create',
}: InvoiceFormProps) {
  const [vendorId, setVendorId] = React.useState(initialData?.vendorId ?? '');
  const [invoiceNumber, setInvoiceNumber] = React.useState(initialData?.invoiceNumber ?? '');
  const [invoiceDate, setInvoiceDate] = React.useState(
    formatDateForInput(initialData?.invoiceDate)
  );
  const [billingPeriodStart, setBillingPeriodStart] = React.useState(
    formatDateForInput(initialData?.billingPeriodStart)
  );
  const [billingPeriodEnd, setBillingPeriodEnd] = React.useState(
    formatDateForInput(initialData?.billingPeriodEnd)
  );
  const [amount, setAmount] = React.useState<string>(
    initialData?.amount?.toString() ?? ''
  );
  const [currency, setCurrency] = React.useState(initialData?.currency ?? 'GBP');
  const [status, setStatus] = React.useState<InvoiceStatus>(
    initialData?.status ?? 'pending'
  );
  const [toleranceThreshold, setToleranceThreshold] = React.useState<string>(
    initialData?.toleranceThreshold?.toString() ?? '5'
  );
  const [error, setError] = React.useState<string | null>(null);

  // Update form when initialData changes (for edit mode)
  React.useEffect(() => {
    if (initialData) {
      setVendorId(initialData.vendorId ?? '');
      setInvoiceNumber(initialData.invoiceNumber ?? '');
      setInvoiceDate(formatDateForInput(initialData.invoiceDate));
      setBillingPeriodStart(formatDateForInput(initialData.billingPeriodStart));
      setBillingPeriodEnd(formatDateForInput(initialData.billingPeriodEnd));
      setAmount(initialData.amount?.toString() ?? '');
      setCurrency(initialData.currency ?? 'GBP');
      setStatus(initialData.status ?? 'pending');
      setToleranceThreshold(initialData.toleranceThreshold?.toString() ?? '5');
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

    if (!invoiceNumber.trim()) {
      setError('Invoice number is required');
      return;
    }

    if (invoiceNumber.length > 100) {
      setError('Invoice number must be at most 100 characters');
      return;
    }

    if (!invoiceDate) {
      setError('Invoice date is required');
      return;
    }

    if (!billingPeriodStart) {
      setError('Billing period start is required');
      return;
    }

    if (!billingPeriodEnd) {
      setError('Billing period end is required');
      return;
    }

    const start = new Date(billingPeriodStart);
    const end = new Date(billingPeriodEnd);

    if (end < start) {
      setError('Billing period end must be after or equal to billing period start');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      setError('Amount must be a valid positive number');
      return;
    }

    if (!currency || currency.length !== 3) {
      setError('Currency must be a valid 3-letter code');
      return;
    }

    const numericTolerance = parseFloat(toleranceThreshold);
    if (isNaN(numericTolerance) || numericTolerance < 0 || numericTolerance > 100) {
      setError('Tolerance threshold must be a number between 0 and 100');
      return;
    }

    onSubmit({
      vendorId,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      billingPeriodStart,
      billingPeriodEnd,
      amount: numericAmount,
      currency: currency.toUpperCase(),
      status,
      toleranceThreshold: numericTolerance,
    });
  };

  // Common currency options
  const currencies = ['GBP', 'USD', 'EUR', 'AUD', 'CAD', 'CHF', 'JPY'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="invoice-form">
      <div className="space-y-2">
        <Label htmlFor="vendorId">
          Vendor <span className="text-destructive">*</span>
        </Label>
        <Select
          value={vendorId}
          onValueChange={setVendorId}
          disabled={isLoading}
        >
          <SelectTrigger data-testid="invoice-vendor-select">
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
        <Label htmlFor="invoiceNumber">
          Invoice Number <span className="text-destructive">*</span>
        </Label>
        <Input
          id="invoiceNumber"
          type="text"
          placeholder="Enter invoice number"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          data-testid="invoice-number-input"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoiceDate">
          Invoice Date <span className="text-destructive">*</span>
        </Label>
        <Input
          id="invoiceDate"
          type="date"
          value={invoiceDate}
          onChange={(e) => setInvoiceDate(e.target.value)}
          data-testid="invoice-date-input"
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="billingPeriodStart">
            Billing Period Start <span className="text-destructive">*</span>
          </Label>
          <Input
            id="billingPeriodStart"
            type="date"
            value={billingPeriodStart}
            onChange={(e) => setBillingPeriodStart(e.target.value)}
            data-testid="invoice-billing-start-input"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="billingPeriodEnd">
            Billing Period End <span className="text-destructive">*</span>
          </Label>
          <Input
            id="billingPeriodEnd"
            type="date"
            value={billingPeriodEnd}
            onChange={(e) => setBillingPeriodEnd(e.target.value)}
            data-testid="invoice-billing-end-input"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">
            Invoice Amount <span className="text-destructive">*</span>
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            data-testid="invoice-amount-input"
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
            <SelectTrigger data-testid="invoice-currency-select">
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(value: InvoiceStatus) => setStatus(value)}
            disabled={isLoading}
          >
            <SelectTrigger data-testid="invoice-status-select">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="validated">Validated</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="toleranceThreshold">
            Tolerance Threshold (%)
          </Label>
          <Input
            id="toleranceThreshold"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="5"
            value={toleranceThreshold}
            onChange={(e) => setToleranceThreshold(e.target.value)}
            data-testid="invoice-tolerance-input"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Acceptable variance between invoice and calculated spend
          </p>
        </div>
      </div>

      {error && (
        <div
          className="rounded-md bg-destructive/15 p-3 text-sm text-destructive"
          data-testid="invoice-form-error"
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
            data-testid="invoice-form-cancel"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading} data-testid="invoice-form-submit">
          {isLoading
            ? 'Saving...'
            : mode === 'edit'
            ? 'Update Invoice'
            : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}
