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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Lock,
  Loader2,
} from 'lucide-react';
import type { GroupWithCounts } from '@/types';
import { ComponentGuard } from '@/components/permissions/rbac-guard';

interface GroupsManagementProps {
  initialGroups?: GroupWithCounts[];
}

interface GroupFormData {
  name: string;
  description: string;
}

const defaultFormData: GroupFormData = {
  name: '',
  description: '',
};

export function GroupsManagement({ initialGroups = [] }: GroupsManagementProps) {
  const [groups, setGroups] = React.useState<GroupWithCounts[]>(initialGroups);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>('create');
  const [selectedGroup, setSelectedGroup] = React.useState<GroupWithCounts | null>(null);
  const [formData, setFormData] = React.useState<GroupFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [groupToDelete, setGroupToDelete] = React.useState<GroupWithCounts | null>(null);

  // Fetch groups
  const fetchGroups = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/access-control/groups?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch groups');
      }

      setGroups(data.data.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  React.useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Handle opening create dialog
  const handleOpenCreate = () => {
    setFormData(defaultFormData);
    setSelectedGroup(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  // Handle opening edit dialog
  const handleOpenEdit = (group: GroupWithCounts) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
    });
    setDialogMode('edit');
    setDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const url =
        dialogMode === 'create'
          ? '/api/access-control/groups'
          : `/api/access-control/groups/${selectedGroup?.id}`;

      const method = dialogMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save group');
      }

      setSuccess(
        dialogMode === 'create' ? 'Group created successfully' : 'Group updated successfully'
      );
      setDialogOpen(false);
      fetchGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save group');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!groupToDelete) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/access-control/groups/${groupToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete group');
      }

      setSuccess('Group deleted successfully');
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
      fetchGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear messages after delay
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Management
            </CardTitle>
            <CardDescription>
              Create and manage permission groups for organizing users
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Group
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        {error && (
          <div className="rounded-md bg-destructive/15 p-4 text-destructive text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-500/15 p-4 text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Groups Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Members</TableHead>
                <TableHead className="text-center">Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No groups found
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {group.name}
                        {group.isSystem && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            System
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {group.description || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{group.memberCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{group.permissionCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(group)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <ComponentGuard componentKey="group-delete">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setGroupToDelete(group);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={group.isSystem}
                            title={group.isSystem ? 'System groups cannot be deleted' : undefined}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ComponentGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialogMode === 'create' ? 'Create New Group' : 'Edit Group'}
              </DialogTitle>
              <DialogDescription>
                {dialogMode === 'create'
                  ? 'Create a new permission group for organizing users'
                  : 'Update the group name and description'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Finance Team"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Describe the purpose of this group..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {dialogMode === 'create' ? 'Create Group' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Group</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{groupToDelete?.name}</strong>?
                {groupToDelete && groupToDelete.memberCount > 0 && (
                  <span className="block mt-2 text-amber-600">
                    Warning: This group has {groupToDelete.memberCount} member(s). They will
                    be removed from this group.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
