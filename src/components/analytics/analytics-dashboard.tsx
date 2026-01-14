'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Users,
  FileText,
  Receipt,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { StatCard } from './stat-card';
import { SpendByVendorChart } from './spend-by-vendor-chart';
import { SpendOverTimeChart } from './spend-over-time-chart';
import { SpendByRoleChart } from './spend-by-role-chart';
import { SpendByCurrencyChart } from './spend-by-currency-chart';
import { ContractExpirationWidget } from './contract-expiration-widget';
import { InvoiceStatusChart } from './invoice-status-chart';
import { DateRangeFilter } from './date-range-filter';
import type { AnalyticsData } from '@/app/api/analytics/route';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAnalytics = useCallback(async (fromDate?: string, toDate?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('dateFrom', fromDate);
      if (toDate) params.set('dateTo', toDate);

      const url = `/api/analytics${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleApplyFilter = () => {
    fetchAnalytics(dateFrom, dateTo);
  };

  const handleClearFilter = () => {
    setDateFrom('');
    setDateTo('');
    fetchAnalytics();
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onApply={handleApplyFilter}
          onClear={handleClearFilter}
          isLoading={true}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-96 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium text-destructive">Error loading analytics</p>
        <p className="text-muted-foreground">{error}</p>
        <button
          onClick={() => fetchAnalytics()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      {/* Date Range Filter */}
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onApply={handleApplyFilter}
        onClear={handleClearFilter}
        isLoading={isLoading}
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Vendors"
          value={data.vendorStats.totalVendors}
          description={`${data.vendorStats.activeVendors} active, ${data.vendorStats.inactiveVendors} inactive`}
          icon={Building2}
        />
        <StatCard
          title="Team Members"
          value={data.teamStats.totalTeamMembers}
          description={`${data.teamStats.activeTeamMembers} active, ${data.teamStats.onboardingTeamMembers} onboarding`}
          icon={Users}
        />
        <StatCard
          title="Active Contracts"
          value={data.contractStats.activeContracts}
          description={`${formatCurrency(data.contractStats.totalValue)} total value`}
          icon={FileText}
        />
        <StatCard
          title="Total Invoice Amount"
          value={formatCurrency(data.invoiceStats.totalAmount)}
          description={`${data.invoiceStats.totalInvoices} invoices total`}
          icon={Receipt}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Invoices"
          value={data.invoiceStats.pendingInvoices}
          description="Awaiting validation"
          icon={DollarSign}
        />
        <StatCard
          title="Disputed Invoices"
          value={data.invoiceStats.disputedInvoices}
          description="Requires attention"
          icon={AlertTriangle}
        />
        <StatCard
          title="Expiring Contracts"
          value={data.contractStats.expiringWithin30Days}
          description="Within 30 days"
          icon={FileText}
        />
        <StatCard
          title="Over Tolerance"
          value={data.invoiceStats.invoicesExceedingTolerance}
          description="Invoices exceeding threshold"
          icon={TrendingUp}
        />
      </div>

      {/* Charts - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <SpendOverTimeChart data={data.spendOverTime} />
        <SpendByVendorChart data={data.spendByVendor} />
      </div>

      {/* Charts - Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <SpendByRoleChart data={data.spendByRole} />
        <InvoiceStatusChart stats={data.invoiceStats} />
      </div>

      {/* Charts - Row 3 */}
      <div className="grid gap-4 md:grid-cols-2">
        <SpendByCurrencyChart data={data.spendByCurrency} />
        <ContractExpirationWidget contracts={data.expiringContracts} />
      </div>
    </div>
  );
}
