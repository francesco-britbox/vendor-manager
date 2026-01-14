'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RateCardForm } from './rate-card-form';
import { RateCardTable } from './rate-card-table';
import { FileText, DollarSign, Clock, CalendarClock, Building2, Briefcase, Coins } from 'lucide-react';
import type { RateCardWithDetails } from '@/lib/rate-cards';
import type { Vendor, Role } from '@/types';

interface RateCardStats {
  totalRateCards: number;
  activeRateCards: number;
  expiredRateCards: number;
  futureRateCards: number;
  vendorsWithRateCards: number;
  rolesWithRateCards: number;
  uniqueCurrencies: number;
}

interface RateCardConfigProps {
  initialRateCards?: RateCardWithDetails[];
  initialStats?: RateCardStats;
  vendors?: Vendor[];
  roles?: Role[];
}

/**
 * Full rate card configuration interface with CRUD operations
 * and statistics dashboard
 */
export function RateCardConfig({
  initialRateCards = [],
  initialStats,
  vendors: initialVendors = [],
  roles: initialRoles = [],
}: RateCardConfigProps) {
  const [rateCards, setRateCards] = React.useState<RateCardWithDetails[]>(initialRateCards);
  const [stats, setStats] = React.useState<RateCardStats | null>(initialStats ?? null);
  const [vendors, setVendors] = React.useState<Vendor[]>(initialVendors);
  const [roles, setRoles] = React.useState<Role[]>(initialRoles);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [editingRateCard, setEditingRateCard] = React.useState<RateCardWithDetails | null>(null);

  // Fetch rate cards, vendors, and roles on mount if not provided
  React.useEffect(() => {
    if (initialRateCards.length === 0) {
      fetchRateCards();
    }
    if (initialVendors.length === 0) {
      fetchVendors();
    }
    if (initialRoles.length === 0) {
      fetchRoles();
    }
  }, [initialRateCards.length, initialVendors.length, initialRoles.length]);

  const fetchRateCards = async () => {
    try {
      const response = await fetch('/api/rate-cards?includeStats=true');
      const data = await response.json();

      if (data.success) {
        setRateCards(data.data.rateCards);
        setStats(data.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch rate cards:', err);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      const data = await response.json();

      if (data.success) {
        setVendors(data.data.vendors);
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      const data = await response.json();

      if (data.success) {
        setRoles(data.data.roles);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const handleSubmit = async (formData: {
    vendorId: string;
    roleId: string;
    rate: number;
    currency: string;
    effectiveFrom: string;
    effectiveTo?: string;
    notes?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const isEditing = !!editingRateCard;
      const url = isEditing ? `/api/rate-cards/${editingRateCard.id}` : '/api/rate-cards';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
          effectiveTo: formData.effectiveTo ? new Date(formData.effectiveTo).toISOString() : null,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} rate card`);
      }

      setSuccess(`Rate card ${isEditing ? 'updated' : 'created'} successfully`);
      setEditingRateCard(null);
      await fetchRateCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rate card');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (rateCard: RateCardWithDetails) => {
    setEditingRateCard(rateCard);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    setEditingRateCard(null);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/rate-cards/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete rate card');
      }

      setSuccess('Rate card deleted successfully');
      await fetchRateCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rate card');
    } finally {
      setIsDeleting(null);
    }
  };

  /**
   * Format date for form input
   */
  const formatDateForForm = (date: Date | string | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold" data-testid="total-rate-cards">{stats.totalRateCards}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
              <p className="text-2xl font-bold text-green-600" data-testid="active-rate-cards">{stats.activeRateCards}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Expired</span>
              </div>
              <p className="text-2xl font-bold" data-testid="expired-rate-cards">{stats.expiredRateCards}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Scheduled</span>
              </div>
              <p className="text-2xl font-bold text-blue-600" data-testid="future-rate-cards">{stats.futureRateCards}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Vendors</span>
              </div>
              <p className="text-2xl font-bold" data-testid="vendors-with-rate-cards">{stats.vendorsWithRateCards}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Roles</span>
              </div>
              <p className="text-2xl font-bold" data-testid="roles-with-rate-cards">{stats.rolesWithRateCards}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Currencies</span>
              </div>
              <p className="text-2xl font-bold" data-testid="unique-currencies">{stats.uniqueCurrencies}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notification Messages */}
      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive" data-testid="rate-card-error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/15 p-4 text-green-700" data-testid="rate-card-success-message">
          {success}
        </div>
      )}

      {/* Add/Edit Rate Card Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {editingRateCard ? 'Edit Rate Card' : 'Add New Rate Card'}
          </CardTitle>
          <CardDescription>
            {editingRateCard
              ? `Editing rate card for ${editingRateCard.vendor.name} - ${editingRateCard.role.name}`
              : 'Define vendor-specific pricing by role with effective date ranges and currency support.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 || roles.length === 0 ? (
            <div className="rounded-md bg-yellow-500/15 p-4 text-yellow-700">
              {vendors.length === 0 && roles.length === 0
                ? 'Please create vendors and roles before adding rate cards.'
                : vendors.length === 0
                ? 'Please create vendors before adding rate cards.'
                : 'Please create roles before adding rate cards.'}
            </div>
          ) : (
            <RateCardForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              vendors={vendors}
              roles={roles}
              initialData={
                editingRateCard
                  ? {
                      vendorId: editingRateCard.vendorId,
                      roleId: editingRateCard.roleId,
                      rate: editingRateCard.rate,
                      currency: editingRateCard.currency,
                      effectiveFrom: formatDateForForm(editingRateCard.effectiveFrom),
                      effectiveTo: editingRateCard.effectiveTo
                        ? formatDateForForm(editingRateCard.effectiveTo)
                        : undefined,
                      notes: editingRateCard.notes,
                    }
                  : undefined
              }
              onCancel={editingRateCard ? handleCancelEdit : undefined}
            />
          )}
        </CardContent>
      </Card>

      {/* Rate Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Rate Cards</CardTitle>
          <CardDescription>
            All rate cards with their effective periods and status. Historical rates are preserved for audit purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RateCardTable
            rateCards={rateCards}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
