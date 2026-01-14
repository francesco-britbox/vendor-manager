'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExchangeRateForm } from './exchange-rate-form';
import { ExchangeRateTable } from './exchange-rate-table';
import { Settings, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ExchangeRateWithMeta } from '@/lib/currency';

interface ExchangeRateStats {
  totalRates: number;
  staleRates: number;
  lastUpdateTime: string | null;
  uniqueBaseCurrencies: number;
  uniqueTargetCurrencies: number;
}

interface ExchangeRateConfigProps {
  initialRates?: ExchangeRateWithMeta[];
  initialStats?: ExchangeRateStats;
}

/**
 * Full exchange rate configuration interface with CRUD operations
 * and statistics dashboard
 */
export function ExchangeRateConfig({
  initialRates = [],
  initialStats,
}: ExchangeRateConfigProps) {
  const [rates, setRates] = React.useState<ExchangeRateWithMeta[]>(initialRates);
  const [stats, setStats] = React.useState<ExchangeRateStats | null>(initialStats ?? null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Fetch rates on mount if not provided
  React.useEffect(() => {
    if (initialRates.length === 0) {
      fetchRates();
    }
  }, [initialRates.length]);

  const fetchRates = async () => {
    try {
      const response = await fetch('/api/exchange-rates');
      const data = await response.json();

      if (data.success) {
        setRates(data.data.rates);
        setStats(data.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch exchange rates:', err);
    }
  };

  const handleSubmit = async (formData: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
  }) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save exchange rate');
      }

      setSuccess('Exchange rate saved successfully');
      await fetchRates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save exchange rate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/exchange-rates/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete exchange rate');
      }

      setSuccess('Exchange rate deleted successfully');
      await fetchRates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete exchange rate');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Rates</span>
              </div>
              <p className="text-2xl font-bold" data-testid="total-rates">{stats.totalRates}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                {stats.staleRates > 0 ? (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm text-muted-foreground">Stale Rates</span>
              </div>
              <p className="text-2xl font-bold" data-testid="stale-rates">{stats.staleRates}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Base Currencies</span>
              </div>
              <p className="text-2xl font-bold">{stats.uniqueBaseCurrencies}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Target Currencies</span>
              </div>
              <p className="text-2xl font-bold">{stats.uniqueTargetCurrencies}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notification Messages */}
      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/15 p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Add/Edit Exchange Rate Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure Exchange Rate
          </CardTitle>
          <CardDescription>
            Add or update exchange rates for currency conversion. Rates are tracked with timestamps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExchangeRateForm onSubmit={handleSubmit} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Exchange Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Exchange Rates</CardTitle>
          <CardDescription>
            Current exchange rates with their last update timestamps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExchangeRateTable
            rates={rates}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
