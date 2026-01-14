'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleForm } from './role-form';
import { RoleTable } from './role-table';
import { Briefcase, Users, FileText, AlertCircle } from 'lucide-react';
import type { RoleWithUsage } from '@/lib/roles';

interface RoleStats {
  totalRoles: number;
  rolesWithTeamMembers: number;
  rolesWithRateCards: number;
  unusedRoles: number;
}

interface RoleConfigProps {
  initialRoles?: RoleWithUsage[];
  initialStats?: RoleStats;
}

/**
 * Full role configuration interface with CRUD operations
 * and statistics dashboard
 */
export function RoleConfig({
  initialRoles = [],
  initialStats,
}: RoleConfigProps) {
  const [roles, setRoles] = React.useState<RoleWithUsage[]>(initialRoles);
  const [stats, setStats] = React.useState<RoleStats | null>(initialStats ?? null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [editingRole, setEditingRole] = React.useState<RoleWithUsage | null>(null);

  // Fetch roles on mount if not provided
  React.useEffect(() => {
    if (initialRoles.length === 0) {
      fetchRoles();
    }
  }, [initialRoles.length]);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles?includeStats=true');
      const data = await response.json();

      if (data.success) {
        setRoles(data.data.roles);
        setStats(data.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const handleSubmit = async (formData: { name: string; description?: string }) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const isEditing = !!editingRole;
      const url = isEditing ? `/api/roles/${editingRole.id}` : '/api/roles';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} role`);
      }

      setSuccess(`Role ${isEditing ? 'updated' : 'created'} successfully`);
      setEditingRole(null);
      await fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (role: RoleWithUsage) => {
    setEditingRole(role);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/roles/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete role');
      }

      setSuccess('Role deleted successfully');
      await fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role');
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
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Roles</span>
              </div>
              <p className="text-2xl font-bold" data-testid="total-roles">{stats.totalRoles}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">With Team Members</span>
              </div>
              <p className="text-2xl font-bold" data-testid="roles-with-team-members">{stats.rolesWithTeamMembers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">With Rate Cards</span>
              </div>
              <p className="text-2xl font-bold" data-testid="roles-with-rate-cards">{stats.rolesWithRateCards}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Unused Roles</span>
              </div>
              <p className="text-2xl font-bold" data-testid="unused-roles">{stats.unusedRoles}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notification Messages */}
      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive" data-testid="role-error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/15 p-4 text-green-700" data-testid="role-success-message">
          {success}
        </div>
      )}

      {/* Add/Edit Role Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            {editingRole ? 'Edit Role' : 'Add New Role'}
          </CardTitle>
          <CardDescription>
            {editingRole
              ? `Editing role: ${editingRole.name}`
              : 'Define reusable roles that can be assigned to team members and linked to rate cards.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoleForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            initialData={
              editingRole
                ? { name: editingRole.name, description: editingRole.description }
                : undefined
            }
            onCancel={editingRole ? handleCancelEdit : undefined}
          />
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Defined Roles</CardTitle>
          <CardDescription>
            All configured roles with their usage statistics. Roles in use cannot be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoleTable
            roles={roles}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
