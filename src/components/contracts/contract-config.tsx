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
import { ContractTable } from './contract-table';
import { ContractDialog } from './contract-dialog';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  FileQuestion,
} from 'lucide-react';
import type { ContractStatus, Vendor } from '@/types';
import type { ContractWithVendor } from '@/lib/contracts';

interface ContractStats {
  totalContracts: number;
  draftContracts: number;
  activeContracts: number;
  expiredContracts: number;
  terminatedContracts: number;
  expiringWithin30Days: number;
  totalValue: number;
}

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

interface ContractConfigProps {
  initialContracts?: ContractWithVendor[];
  initialStats?: ContractStats;
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
 * Full contract configuration interface with CRUD operations
 * and statistics dashboard
 */
export function ContractConfig({
  initialContracts = [],
  initialStats,
  initialVendors = [],
}: ContractConfigProps) {
  const [contracts, setContracts] = React.useState<ContractWithVendor[]>(initialContracts);
  const [vendors, setVendors] = React.useState<Array<{ id: string; name: string }>>(initialVendors);
  const [stats, setStats] = React.useState<ContractStats | null>(
    initialStats ?? null
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>(
    'create'
  );
  const [selectedContract, setSelectedContract] = React.useState<ContractWithVendor | null>(
    null
  );

  // Filter state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  // Fetch contracts and vendors on mount if not provided
  React.useEffect(() => {
    if (initialContracts.length === 0) {
      fetchContracts();
    }
    if (initialVendors.length === 0) {
      fetchVendors();
    }
  }, [initialContracts.length, initialVendors.length]);

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/contracts?includeStats=true');
      const data = await response.json();

      if (data.success) {
        setContracts(data.data.contracts);
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
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

  const handleCreate = async (formData: ContractFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create contract');
      }

      setSuccess('Contract created successfully');
      setDialogOpen(false);
      await fetchContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contract');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (formData: ContractFormData) => {
    if (!selectedContract) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/contracts/${selectedContract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update contract');
      }

      setSuccess('Contract updated successfully');
      setDialogOpen(false);
      setSelectedContract(null);
      await fetchContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contract');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) {
      return;
    }

    setIsDeleting(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/contracts/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete contract');
      }

      setSuccess('Contract deleted successfully');
      await fetchContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contract');
    } finally {
      setIsDeleting(null);
    }
  };

  const openCreateDialog = () => {
    setSelectedContract(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const openEditDialog = (contract: ContractWithVendor) => {
    setSelectedContract(contract);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  // Filter contracts
  const filteredContracts = React.useMemo(() => {
    return contracts.filter((contract) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesTitle = contract.title.toLowerCase().includes(search);
        const matchesVendor = contract.vendor.name.toLowerCase().includes(search);
        if (!matchesTitle && !matchesVendor) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && contract.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [contracts, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      {stats && (
        <div
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4"
          data-testid="contract-stats"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Total
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="total-contracts">
                {stats.totalContracts}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileQuestion className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-muted-foreground">
                  Draft
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="draft-contracts">
                {stats.draftContracts}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  Active
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="active-contracts">
                {stats.activeContracts}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">
                  Expired
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="expired-contracts">
                {stats.expiredContracts}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">
                  Terminated
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="terminated-contracts">
                {stats.terminatedContracts}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">
                  Expiring Soon
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="expiring-contracts">
                {stats.expiringWithin30Days}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  Active Value
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="total-value">
                {formatCurrency(stats.totalValue)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notification Messages */}
      {error && (
        <div
          className="rounded-md bg-destructive/15 p-4 text-destructive"
          data-testid="contract-error-message"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-md bg-green-500/15 p-4 text-green-700"
          data-testid="contract-success-message"
        >
          {success}
        </div>
      )}

      {/* Contract List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contracts
              </CardTitle>
              <CardDescription>
                Manage your contracts and track their lifecycle
              </CardDescription>
            </div>
            <Button
              onClick={openCreateDialog}
              data-testid="create-contract-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contract
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contracts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="contract-search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-full md:w-[180px]"
                data-testid="contract-status-filter"
              >
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <ContractTable
            contracts={filteredContracts}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <ContractDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedContract(null);
          }
        }}
        onSubmit={dialogMode === 'edit' ? handleUpdate : handleCreate}
        isLoading={isLoading}
        contract={selectedContract}
        vendors={vendors}
        mode={dialogMode}
      />
    </div>
  );
}
