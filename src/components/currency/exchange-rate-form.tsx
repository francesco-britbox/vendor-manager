'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencySelect } from './currency-select';
import { DEFAULT_CURRENCY_CODE } from '@/lib/currency';

interface ExchangeRateFormProps {
  onSubmit: (data: { fromCurrency: string; toCurrency: string; rate: number }) => void;
  isLoading?: boolean;
  initialData?: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
  };
}

/**
 * Form for creating or editing exchange rates
 */
export function ExchangeRateForm({
  onSubmit,
  isLoading = false,
  initialData,
}: ExchangeRateFormProps) {
  const [fromCurrency, setFromCurrency] = React.useState(
    initialData?.fromCurrency ?? DEFAULT_CURRENCY_CODE
  );
  const [toCurrency, setToCurrency] = React.useState(initialData?.toCurrency ?? '');
  const [rate, setRate] = React.useState(initialData?.rate?.toString() ?? '');
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!fromCurrency) {
      setError('Please select a source currency');
      return;
    }
    if (!toCurrency) {
      setError('Please select a target currency');
      return;
    }
    if (fromCurrency === toCurrency) {
      setError('Source and target currencies must be different');
      return;
    }

    const rateValue = parseFloat(rate);
    if (isNaN(rateValue) || rateValue <= 0) {
      setError('Please enter a valid exchange rate greater than 0');
      return;
    }

    onSubmit({
      fromCurrency,
      toCurrency,
      rate: rateValue,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fromCurrency">From Currency</Label>
          <CurrencySelect
            value={fromCurrency}
            onValueChange={setFromCurrency}
            placeholder="Select source currency"
            excludeCurrency={toCurrency}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="toCurrency">To Currency</Label>
          <CurrencySelect
            value={toCurrency}
            onValueChange={setToCurrency}
            placeholder="Select target currency"
            excludeCurrency={fromCurrency}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rate">Exchange Rate</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">1 {fromCurrency || '...'} =</span>
          <Input
            id="rate"
            type="number"
            step="0.000001"
            min="0.000001"
            placeholder="Enter exchange rate"
            value={rate}
            onChange={e => setRate(e.target.value)}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground">{toCurrency || '...'}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter how many {toCurrency || 'target currency units'} equal 1 {fromCurrency || 'source currency unit'}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Saving...' : initialData ? 'Update Exchange Rate' : 'Add Exchange Rate'}
      </Button>
    </form>
  );
}
