'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CURRENCIES } from '@/lib/currency/currencies';
import type { Vendor, Role } from '@/types';

interface RateCardFormProps {
  onSubmit: (data: {
    vendorId: string;
    roleId: string;
    rate: number;
    currency: string;
    effectiveFrom: string;
    effectiveTo?: string;
    notes?: string;
  }) => void;
  isLoading?: boolean;
  initialData?: {
    vendorId: string;
    roleId: string;
    rate: number;
    currency: string;
    effectiveFrom: string;
    effectiveTo?: string;
    notes?: string;
  };
  vendors: Vendor[];
  roles: Role[];
  onCancel?: () => void;
}

/**
 * Format a date to YYYY-MM-DD for input type="date"
 */
function formatDateForInput(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Form for creating or editing rate cards
 */
export function RateCardForm({
  onSubmit,
  isLoading = false,
  initialData,
  vendors,
  roles,
  onCancel,
}: RateCardFormProps) {
  const [vendorId, setVendorId] = React.useState(initialData?.vendorId ?? '');
  const [roleId, setRoleId] = React.useState(initialData?.roleId ?? '');
  const [rate, setRate] = React.useState(initialData?.rate?.toString() ?? '');
  const [currency, setCurrency] = React.useState(initialData?.currency ?? 'GBP');
  const [effectiveFrom, setEffectiveFrom] = React.useState(
    formatDateForInput(initialData?.effectiveFrom) || formatDateForInput(new Date())
  );
  const [effectiveTo, setEffectiveTo] = React.useState(
    formatDateForInput(initialData?.effectiveTo)
  );
  const [notes, setNotes] = React.useState(initialData?.notes ?? '');
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when initialData changes
  React.useEffect(() => {
    setVendorId(initialData?.vendorId ?? '');
    setRoleId(initialData?.roleId ?? '');
    setRate(initialData?.rate?.toString() ?? '');
    setCurrency(initialData?.currency ?? 'GBP');
    setEffectiveFrom(formatDateForInput(initialData?.effectiveFrom) || formatDateForInput(new Date()));
    setEffectiveTo(formatDateForInput(initialData?.effectiveTo));
    setNotes(initialData?.notes ?? '');
    setError(null);
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!vendorId) {
      setError('Please select a vendor');
      return;
    }

    if (!roleId) {
      setError('Please select a role');
      return;
    }

    const rateValue = parseFloat(rate);
    if (isNaN(rateValue) || rateValue <= 0) {
      setError('Rate must be a positive number');
      return;
    }

    if (!effectiveFrom) {
      setError('Effective from date is required');
      return;
    }

    if (effectiveTo && new Date(effectiveTo) <= new Date(effectiveFrom)) {
      setError('Effective to date must be after effective from date');
      return;
    }

    const trimmedNotes = notes.trim();
    if (trimmedNotes.length > 5000) {
      setError('Notes must be at most 5000 characters');
      return;
    }

    onSubmit({
      vendorId,
      roleId,
      rate: rateValue,
      currency,
      effectiveFrom,
      effectiveTo: effectiveTo || undefined,
      notes: trimmedNotes || undefined,
    });

    // Clear form if creating new (not editing)
    if (!initialData) {
      setVendorId('');
      setRoleId('');
      setRate('');
      setCurrency('GBP');
      setEffectiveFrom(formatDateForInput(new Date()));
      setEffectiveTo('');
      setNotes('');
    }
  };

  const handleCancel = () => {
    setVendorId(initialData?.vendorId ?? '');
    setRoleId(initialData?.roleId ?? '');
    setRate(initialData?.rate?.toString() ?? '');
    setCurrency(initialData?.currency ?? 'GBP');
    setEffectiveFrom(formatDateForInput(initialData?.effectiveFrom) || formatDateForInput(new Date()));
    setEffectiveTo(formatDateForInput(initialData?.effectiveTo));
    setNotes(initialData?.notes ?? '');
    setError(null);
    onCancel?.();
  };

  // Sort vendors and roles alphabetically
  const sortedVendors = [...vendors].sort((a, b) => a.name.localeCompare(b.name));
  const sortedRoles = [...roles].sort((a, b) => a.name.localeCompare(b.name));

  // Group currencies by region for better UX
  const majorCurrencies = CURRENCIES.slice(0, 8);
  const otherCurrencies = CURRENCIES.slice(8);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vendor Selection */}
        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor *</Label>
          <Select
            value={vendorId}
            onValueChange={setVendorId}
            disabled={isLoading}
          >
            <SelectTrigger id="vendor" data-testid="rate-card-vendor-select">
              <SelectValue placeholder="Select a vendor" />
            </SelectTrigger>
            <SelectContent>
              {sortedVendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                  {vendor.status === 'inactive' && (
                    <span className="text-muted-foreground ml-2">(Inactive)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Role Selection */}
        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <Select
            value={roleId}
            onValueChange={setRoleId}
            disabled={isLoading}
          >
            <SelectTrigger id="role" data-testid="rate-card-role-select">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {sortedRoles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rate Amount */}
        <div className="space-y-2">
          <Label htmlFor="rate">Daily Rate *</Label>
          <Input
            id="rate"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g., 500.00"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            disabled={isLoading}
            data-testid="rate-card-rate-input"
          />
        </div>

        {/* Currency Selection */}
        <div className="space-y-2">
          <Label htmlFor="currency">Currency *</Label>
          <Select
            value={currency}
            onValueChange={setCurrency}
            disabled={isLoading}
          >
            <SelectTrigger id="currency" data-testid="rate-card-currency-select">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__header_major" disabled className="font-semibold text-xs">
                Major Currencies
              </SelectItem>
              {majorCurrencies.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.code} ({curr.symbol}) - {curr.name}
                </SelectItem>
              ))}
              <SelectItem value="__header_other" disabled className="font-semibold text-xs mt-2">
                Other Currencies
              </SelectItem>
              {otherCurrencies.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.code} ({curr.symbol}) - {curr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Effective From Date */}
        <div className="space-y-2">
          <Label htmlFor="effectiveFrom">Effective From *</Label>
          <Input
            id="effectiveFrom"
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            disabled={isLoading}
            data-testid="rate-card-effective-from-input"
          />
          <p className="text-xs text-muted-foreground">
            Date when this rate becomes active
          </p>
        </div>

        {/* Effective To Date */}
        <div className="space-y-2">
          <Label htmlFor="effectiveTo">Effective To</Label>
          <Input
            id="effectiveTo"
            type="date"
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.target.value)}
            disabled={isLoading}
            data-testid="rate-card-effective-to-input"
          />
          <p className="text-xs text-muted-foreground">
            Optional end date (leave empty for ongoing)
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes about this rate card (e.g., negotiation details, special terms)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={isLoading}
          data-testid="rate-card-notes-input"
        />
        <p className="text-xs text-muted-foreground">
          {notes.length}/5000 characters
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" data-testid="rate-card-form-error">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading} className="flex-1" data-testid="rate-card-submit-button">
          {isLoading ? 'Saving...' : initialData ? 'Update Rate Card' : 'Add Rate Card'}
        </Button>
        {initialData && onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
