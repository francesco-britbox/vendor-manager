'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InvoiceTable } from './invoice-table';
import { InvoiceDialog } from './invoice-dialog';
import { ValidationDetailsDialog } from './validation-details';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  CreditCard,
  Calculator,
} from 'lucide-react';
import type { InvoiceStatus, Vendor } from '@/types';
import type { InvoiceWithVendor, InvoiceValidationResult, InvoiceStats } from '@/lib/invoices';

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

interface InvoiceConfigProps {
  initialInvoices?: InvoiceWithVendor[];
  initialStats?: InvoiceStats;
  initialVendors?: Array<{ id: string; name: string }>;
}

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Full invoice configuration interface with CRUD operations
 * and statistics dashboard
 */
export function InvoiceConfig({
  initialInvoices = [],
  initialStats,
  initialVendors = [],
}: InvoiceConfigProps) {
  const [invoices, setInvoices] = React.useState<InvoiceWithVendor[]>(initialInvoices);
  const [vendors, setVendors] = React.useState<Array<{ id: string; name: string }>>(initialVendors);
  const [stats, setStats] = React.useState<InvoiceStats | null>(initialStats ?? null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [isValidating, setIsValidating] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>('create');
  const [selectedInvoice, setSelectedInvoice] = React.useState<InvoiceWithVendor | null>(null);

  // Validation dialog state
  const [validationDialogOpen, setValidationDialogOpen] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<InvoiceValidationResult | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  // Fetch invoices and vendors on mount if not provided
  React.useEffect(() => {
    if (initialInvoices.length === 0) {
      fetchInvoices();
    }
    if (initialVendors.length === 0) {
      fetchVendors();
    }
  }, [initialInvoices.length, initialVendors.length]);

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices?includeStats=true');
      const data = await response.json();

      if (data.success) {
        setInvoices(data.data.invoices);
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      const data = await response.json();

      if (data.success) {
        setVendors(data.data.vendors.map((v: Vendor) => ({ id: v.id, name: v.name })));
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  };

  const handleCreate = async (formData: InvoiceFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create invoice');
      }

      setSuccess('Invoice created successfully');
      setDialogOpen(false);
      await fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (formData: InvoiceFormData) => {
    if (!selectedInvoice) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/invoices/${selectedInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update invoice');
      }

      setSuccess('Invoice updated successfully');
      setDialogOpen(false);
      setSelectedInvoice(null);
      await fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    setIsDeleting(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete invoice');
      }

      setSuccess('Invoice deleted successfully');
      await fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invoice');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleValidate = async (id: string) => {
    setIsValidating(id);
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${id}/validate`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to validate invoice');
      }

      setValidationResult(data.data);
      setValidationDialogOpen(true);
      await fetchInvoices(); // Refresh to show updated validation status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate invoice');
    } finally {
      setIsValidating(null);
    }
  };

  const openCreateDialog = () => {
    setSelectedInvoice(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const openEditDialog = (invoice: InvoiceWithVendor) => {
    setSelectedInvoice(invoice);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  // Filter invoices
  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((invoice) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesNumber = invoice.invoiceNumber.toLowerCase().includes(search);
        const matchesVendor = invoice.vendor.name.toLowerCase().includes(search);
        if (!matchesNumber && !matchesVendor) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && invoice.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [invoices, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      {stats && (
        <div
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4"
          data-testid="invoice-stats"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold" data-testid="total-invoices">
                {stats.totalInvoices}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
              <p className="text-2xl font-bold" data-testid="pending-invoices">
                {stats.pendingInvoices}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Validated</span>
              </div>
              <p className="text-2xl font-bold" data-testid="validated-invoices">
                {stats.validatedInvoices}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Disputed</span>
              </div>
              <p className="text-2xl font-bold" data-testid="disputed-invoices">
                {stats.disputedInvoices}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Paid</span>
              </div>
              <p className="text-2xl font-bold" data-testid="paid-invoices">
                {stats.paidInvoices}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Total Amount</span>
              </div>
              <p className="text-2xl font-bold" data-testid="total-amount">
                {formatCurrency(stats.totalAmount)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Expected</span>
              </div>
              <p className="text-2xl font-bold" data-testid="expected-amount">
                {formatCurrency(stats.totalExpectedAmount)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Over Tolerance</span>
              </div>
              <p className="text-2xl font-bold" data-testid="over-tolerance">
                {stats.invoicesExceedingTolerance}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notification Messages */}
      {error && (
        <div
          className="rounded-md bg-destructive/15 p-4 text-destructive"
          data-testid="invoice-error-message"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-md bg-green-500/15 p-4 text-green-700"
          data-testid="invoice-success-message"
        >
          {success}
        </div>
      )}

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoices
              </CardTitle>
              <CardDescription>
                Manage invoices and validate against timesheet spend
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog} data-testid="create-invoice-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Invoice
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="invoice-search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-full md:w-[180px]"
                data-testid="invoice-status-filter"
              >
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="validated">Validated</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <InvoiceTable
            invoices={filteredInvoices}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onValidate={handleValidate}
            isDeleting={isDeleting}
            isValidating={isValidating}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <InvoiceDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedInvoice(null);
          }
        }}
        onSubmit={dialogMode === 'edit' ? handleUpdate : handleCreate}
        isLoading={isLoading}
        invoice={selectedInvoice}
        vendors={vendors}
        mode={dialogMode}
      />

      {/* Validation Results Dialog */}
      <ValidationDetailsDialog
        open={validationDialogOpen}
        onOpenChange={setValidationDialogOpen}
        validationResult={validationResult}
      />
    </div>
  );
}
