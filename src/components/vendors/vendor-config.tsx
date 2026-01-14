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
import { VendorTable } from './vendor-table';
import { VendorDialog } from './vendor-dialog';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react';
import type { Vendor, VendorStatus } from '@/types';

interface VendorStats {
  totalVendors: number;
  activeVendors: number;
  inactiveVendors: number;
}

interface VendorFormData {
  name: string;
  address?: string;
  location?: string;
  serviceDescription?: string;
  status: VendorStatus;
}

interface VendorConfigProps {
  initialVendors?: Vendor[];
  initialStats?: VendorStats;
}

/**
 * Full vendor configuration interface with CRUD operations
 * and statistics dashboard
 */
export function VendorConfig({
  initialVendors = [],
  initialStats,
}: VendorConfigProps) {
  const [vendors, setVendors] = React.useState<Vendor[]>(initialVendors);
  const [stats, setStats] = React.useState<VendorStats | null>(
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
  const [selectedVendor, setSelectedVendor] = React.useState<Vendor | null>(
    null
  );

  // Filter state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  // Fetch vendors on mount if not provided
  React.useEffect(() => {
    if (initialVendors.length === 0) {
      fetchVendors();
    }
  }, [initialVendors.length]);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors?includeStats=true');
      const data = await response.json();

      if (data.success) {
        setVendors(data.data.vendors);
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  };

  const handleCreate = async (formData: VendorFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create vendor');
      }

      setSuccess('Vendor created successfully');
      setDialogOpen(false);
      await fetchVendors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (formData: VendorFormData) => {
    if (!selectedVendor) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/vendors/${selectedVendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update vendor');
      }

      setSuccess('Vendor updated successfully');
      setDialogOpen(false);
      setSelectedVendor(null);
      await fetchVendors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) {
      return;
    }

    setIsDeleting(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/vendors/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete vendor');
      }

      setSuccess('Vendor deleted successfully');
      await fetchVendors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vendor');
    } finally {
      setIsDeleting(null);
    }
  };

  const openCreateDialog = () => {
    setSelectedVendor(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const openEditDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  // Filter vendors
  const filteredVendors = React.useMemo(() => {
    return vendors.filter((vendor) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = vendor.name.toLowerCase().includes(search);
        const matchesDescription = vendor.serviceDescription
          ?.toLowerCase()
          .includes(search);
        const matchesLocation = vendor.location?.toLowerCase().includes(search);
        if (!matchesName && !matchesDescription && !matchesLocation) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && vendor.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [vendors, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      {stats && (
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          data-testid="vendor-stats"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Total Vendors
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="total-vendors">
                {stats.totalVendors}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  Active Vendors
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="active-vendors">
                {stats.activeVendors}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-muted-foreground">
                  Inactive Vendors
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="inactive-vendors">
                {stats.inactiveVendors}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notification Messages */}
      {error && (
        <div
          className="rounded-md bg-destructive/15 p-4 text-destructive"
          data-testid="vendor-error-message"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-md bg-green-500/15 p-4 text-green-700"
          data-testid="vendor-success-message"
        >
          {success}
        </div>
      )}

      {/* Vendor List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Vendors
              </CardTitle>
              <CardDescription>
                Manage your vendors and their information
              </CardDescription>
            </div>
            <Button
              onClick={openCreateDialog}
              data-testid="create-vendor-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="vendor-search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-full md:w-[180px]"
                data-testid="vendor-status-filter"
              >
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <VendorTable
            vendors={filteredVendors}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <VendorDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedVendor(null);
          }
        }}
        onSubmit={dialogMode === 'edit' ? handleUpdate : handleCreate}
        isLoading={isLoading}
        vendor={selectedVendor}
        mode={dialogMode}
      />
    </div>
  );
}
