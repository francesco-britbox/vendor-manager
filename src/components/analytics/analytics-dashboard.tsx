'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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
import { DateRangeFilter, type Vendor } from './date-range-filter';
import type { AnalyticsData } from '@/app/api/analytics/route';

// Helper to get current month date range
function getCurrentMonthDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    dateFrom: from.toISOString().split('T')[0],
    dateTo: to.toISOString().split('T')[0],
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function AnalyticsDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vendor list for filter
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Initialize filter state from URL params or defaults (current month)
  const getInitialDateRange = () => {
    const urlDateFrom = searchParams.get('dateFrom');
    const urlDateTo = searchParams.get('dateTo');

    // If URL has params, use them
    if (urlDateFrom || urlDateTo) {
      return {
        dateFrom: urlDateFrom || '',
        dateTo: urlDateTo || '',
      };
    }

    // Otherwise, default to current month
    return getCurrentMonthDateRange();
  };

  const initialDateRange = getInitialDateRange();
  const [dateFrom, setDateFrom] = useState(initialDateRange.dateFrom);
  const [dateTo, setDateTo] = useState(initialDateRange.dateTo);
  const [selectedVendorId, setSelectedVendorId] = useState(searchParams.get('vendorId') || '');

  // Fetch vendors for filter dropdown
  useEffect(() => {
    async function fetchVendors() {
      try {
        const response = await fetch('/api/vendors');
        const result = await response.json();
        if (result.success) {
          setVendors(result.data.vendors || result.data || []);
        }
      } catch (err) {
        console.error('Error fetching vendors:', err);
      }
    }
    fetchVendors();
  }, []);

  // Update URL with current filter state
  const updateURLParams = useCallback((fromDate: string, toDate: string, vendorId: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.set('dateFrom', fromDate);
    if (toDate) params.set('dateTo', toDate);
    if (vendorId) params.set('vendorId', vendorId);

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router]);

  const fetchAnalytics = useCallback(async (fromDate?: string, toDate?: string, vendorId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (fromDate) params.set('dateFrom', fromDate);
      if (toDate) params.set('dateTo', toDate);
      if (vendorId) params.set('vendorId', vendorId);

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

  // Initial data fetch with default date range (current month)
  useEffect(() => {
    fetchAnalytics(dateFrom, dateTo, selectedVendorId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyFilter = () => {
    fetchAnalytics(dateFrom, dateTo, selectedVendorId);
    updateURLParams(dateFrom, dateTo, selectedVendorId);
  };

  const handleClearFilter = () => {
    // Reset to current month defaults
    const { dateFrom: defaultFrom, dateTo: defaultTo } = getCurrentMonthDateRange();
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setSelectedVendorId('');
    fetchAnalytics(defaultFrom, defaultTo, '');
    updateURLParams(defaultFrom, defaultTo, '');
  };

  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
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
          vendors={vendors}
          selectedVendorId={selectedVendorId}
          onVendorChange={handleVendorChange}
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
      {/* Date Range & Vendor Filter */}
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onApply={handleApplyFilter}
        onClear={handleClearFilter}
        isLoading={isLoading}
        vendors={vendors}
        selectedVendorId={selectedVendorId}
        onVendorChange={handleVendorChange}
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
