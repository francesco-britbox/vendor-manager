'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VendorDialog } from './vendor-dialog';
import {
  ArrowLeft,
  Building2,
  Edit,
  Trash2,
  MapPin,
  FileText,
  Calendar,
  Tag,
} from 'lucide-react';
import type { Vendor, VendorStatus } from '@/types';

interface VendorFormData {
  name: string;
  address?: string;
  location?: string;
  serviceDescription?: string;
  status: VendorStatus;
}

interface VendorDetailProps {
  vendor: Vendor;
}

/**
 * Format a date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(date));
}

/**
 * Detailed view component for a single vendor
 */
export function VendorDetail({ vendor: initialVendor }: VendorDetailProps) {
  const router = useRouter();
  const [vendor, setVendor] = React.useState<Vendor>(initialVendor);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleUpdate = async (formData: VendorFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update vendor');
      }

      setVendor(data.data);
      setSuccess('Vendor updated successfully');
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this vendor? This action cannot be undone.'
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete vendor');
      }

      router.push('/vendors');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vendor');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="vendor-detail">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/vendors')}
            data-testid="back-to-vendors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              data-testid="vendor-detail-name"
            >
              {vendor.name}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  vendor.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
                data-testid="vendor-detail-status"
              >
                {vendor.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setDialogOpen(true)}
            data-testid="edit-vendor-button"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
            data-testid="delete-vendor-button"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Notification Messages */}
      {error && (
        <div
          className="rounded-md bg-destructive/15 p-4 text-destructive"
          data-testid="vendor-detail-error"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-md bg-green-500/15 p-4 text-green-700"
          data-testid="vendor-detail-success"
        >
          {success}
        </div>
      )}

      {/* Vendor Information */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Name
              </label>
              <p className="mt-1">{vendor.name}</p>
            </div>

            {vendor.location && (
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Location
                </label>
                <p className="mt-1" data-testid="vendor-detail-location">
                  {vendor.location}
                </p>
              </div>
            )}

            {vendor.address && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Address
                </label>
                <p className="mt-1" data-testid="vendor-detail-address">
                  {vendor.address}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Description Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Service Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vendor.serviceDescription ? (
              <p
                className="whitespace-pre-wrap"
                data-testid="vendor-detail-service-description"
              >
                {vendor.serviceDescription}
              </p>
            ) : (
              <p className="text-muted-foreground">
                No service description provided.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Dates Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Created
              </label>
              <p className="mt-1" data-testid="vendor-detail-created">
                {formatDate(vendor.createdAt)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Last Updated
              </label>
              <p className="mt-1" data-testid="vendor-detail-updated">
                {formatDate(vendor.updatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tags Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Tags
            </CardTitle>
            <CardDescription>
              Tags associated with this vendor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vendor.tags && vendor.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {vendor.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                    style={{
                      backgroundColor: tag.color
                        ? `${tag.color}20`
                        : '#f3f4f6',
                      color: tag.color || '#374151',
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No tags assigned.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <VendorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleUpdate}
        isLoading={isLoading}
        vendor={vendor}
        mode="edit"
      />
    </div>
  );
}
