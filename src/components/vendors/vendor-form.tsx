'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Vendor, VendorStatus } from '@/types';

interface VendorFormData {
  name: string;
  address?: string;
  location?: string;
  serviceDescription?: string;
  status: VendorStatus;
}

interface VendorFormProps {
  onSubmit: (data: VendorFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<Vendor>;
  mode?: 'create' | 'edit';
}

/**
 * Form for creating or editing vendors
 */
export function VendorForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  mode = 'create',
}: VendorFormProps) {
  const [name, setName] = React.useState(initialData?.name ?? '');
  const [address, setAddress] = React.useState(initialData?.address ?? '');
  const [location, setLocation] = React.useState(initialData?.location ?? '');
  const [serviceDescription, setServiceDescription] = React.useState(
    initialData?.serviceDescription ?? ''
  );
  const [status, setStatus] = React.useState<VendorStatus>(
    initialData?.status ?? 'active'
  );
  const [error, setError] = React.useState<string | null>(null);

  // Update form when initialData changes (for edit mode)
  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name ?? '');
      setAddress(initialData.address ?? '');
      setLocation(initialData.location ?? '');
      setServiceDescription(initialData.serviceDescription ?? '');
      setStatus(initialData.status ?? 'active');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Vendor name is required');
      return;
    }

    if (name.length > 255) {
      setError('Vendor name must be at most 255 characters');
      return;
    }

    if (address && address.length > 500) {
      setError('Address must be at most 500 characters');
      return;
    }

    if (location && location.length > 255) {
      setError('Location must be at most 255 characters');
      return;
    }

    if (serviceDescription && serviceDescription.length > 5000) {
      setError('Service description must be at most 5000 characters');
      return;
    }

    onSubmit({
      name: name.trim(),
      address: address.trim() || undefined,
      location: location.trim() || undefined,
      serviceDescription: serviceDescription.trim() || undefined,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="vendor-form">
      <div className="space-y-2">
        <Label htmlFor="name">
          Vendor Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="Enter vendor name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="vendor-name-input"
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            type="text"
            placeholder="e.g., London, UK"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            data-testid="vendor-location-input"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(value: VendorStatus) => setStatus(value)}
            disabled={isLoading}
          >
            <SelectTrigger data-testid="vendor-status-select">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          type="text"
          placeholder="Enter full address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          data-testid="vendor-address-input"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="serviceDescription">Service Description</Label>
        <textarea
          id="serviceDescription"
          placeholder="Describe the services provided by this vendor"
          value={serviceDescription}
          onChange={(e) => setServiceDescription(e.target.value)}
          className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="vendor-service-description-input"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          {serviceDescription.length}/5000 characters
        </p>
      </div>

      {error && (
        <div
          className="rounded-md bg-destructive/15 p-3 text-sm text-destructive"
          data-testid="vendor-form-error"
        >
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="vendor-form-cancel"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading} data-testid="vendor-form-submit">
          {isLoading
            ? 'Saving...'
            : mode === 'edit'
            ? 'Update Vendor'
            : 'Create Vendor'}
        </Button>
      </div>
    </form>
  );
}
