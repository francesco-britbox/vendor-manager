'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RoleFormProps {
  onSubmit: (data: { name: string; description?: string }) => void;
  isLoading?: boolean;
  initialData?: {
    name: string;
    description?: string;
  };
  onCancel?: () => void;
}

/**
 * Form for creating or editing roles
 */
export function RoleForm({
  onSubmit,
  isLoading = false,
  initialData,
  onCancel,
}: RoleFormProps) {
  const [name, setName] = React.useState(initialData?.name ?? '');
  const [description, setDescription] = React.useState(initialData?.description ?? '');
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when initialData changes
  React.useEffect(() => {
    setName(initialData?.name ?? '');
    setDescription(initialData?.description ?? '');
    setError(null);
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Role name is required');
      return;
    }

    if (trimmedName.length > 255) {
      setError('Role name must be at most 255 characters');
      return;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 5000) {
      setError('Description must be at most 5000 characters');
      return;
    }

    onSubmit({
      name: trimmedName,
      description: trimmedDescription || undefined,
    });

    // Clear form if creating new (not editing)
    if (!initialData) {
      setName('');
      setDescription('');
    }
  };

  const handleCancel = () => {
    setName(initialData?.name ?? '');
    setDescription(initialData?.description ?? '');
    setError(null);
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Role Name *</Label>
        <Input
          id="name"
          type="text"
          placeholder="e.g., Developer, QA Engineer, Designer"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          data-testid="role-name-input"
        />
        <p className="text-xs text-muted-foreground">
          Enter a unique name for this role (e.g., Developer, QA, Designer)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the responsibilities and skills associated with this role..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isLoading}
          data-testid="role-description-input"
        />
        <p className="text-xs text-muted-foreground">
          Optional description of responsibilities and requirements
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" data-testid="role-form-error">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading} className="flex-1" data-testid="role-submit-button">
          {isLoading ? 'Saving...' : initialData ? 'Update Role' : 'Add Role'}
        </Button>
        {initialData && onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
