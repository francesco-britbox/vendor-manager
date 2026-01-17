'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CurrencySelect } from './currency-select';
import { ArrowRightLeft, RefreshCw } from 'lucide-react';
import { DEFAULT_CURRENCY_CODE, getCurrencySymbol } from '@/lib/currency';

interface ConversionResult {
  originalAmount: string;
  convertedAmount: string;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: string;
  rateLastUpdated: Date;
  formattedOriginal: string;
  formattedConverted: string;
}

/**
 * Currency converter component with real-time conversion
 */
export function CurrencyConverter() {
  const [amount, setAmount] = React.useState('100');
  const [fromCurrency, setFromCurrency] = React.useState(DEFAULT_CURRENCY_CODE);
  const [toCurrency, setToCurrency] = React.useState('USD');
  const [result, setResult] = React.useState<ConversionResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleConvert = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/exchange-rates/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          fromCurrency,
          toCurrency,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Conversion failed');
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Currency Converter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-4">
          <div className="space-y-2 min-w-0">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {getCurrencySymbol(fromCurrency)}
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => {
                  setAmount(e.target.value);
                  setResult(null);
                }}
                className="pl-8"
                data-testid="converter-amount"
              />
            </div>
            <CurrencySelect
              value={fromCurrency}
              onValueChange={value => {
                setFromCurrency(value);
                setResult(null);
              }}
              excludeCurrency={toCurrency}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleSwap}
            className="mb-2"
            data-testid="swap-currencies"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>

          <div className="space-y-2 min-w-0">
            <Label>To</Label>
            <div className="h-9 rounded-md border bg-muted/50 px-3 py-2 text-sm">
              {result ? (
                <span className="font-medium" data-testid="converted-amount">
                  {getCurrencySymbol(toCurrency)} {result.convertedAmount}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <CurrencySelect
              value={toCurrency}
              onValueChange={value => {
                setToCurrency(value);
                setResult(null);
              }}
              excludeCurrency={fromCurrency}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={handleConvert}
          disabled={isLoading || !amount || !fromCurrency || !toCurrency}
          className="w-full"
          data-testid="convert-button"
        >
          {isLoading ? 'Converting...' : 'Convert'}
        </Button>

        {result && (
          <div className="rounded-md bg-muted p-4 space-y-2">
            <div className="text-center">
              <span className="text-2xl font-bold" data-testid="conversion-result">
                {result.formattedOriginal} = {result.formattedConverted}
              </span>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Exchange Rate: 1 {result.fromCurrency} = {result.exchangeRate} {result.toCurrency}
              </p>
              <p>
                Rate last updated: {new Date(result.rateLastUpdated).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
