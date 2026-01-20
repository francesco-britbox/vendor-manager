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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Shield,
  ShieldCheck,
  UserX,
  UserCheck,
  Loader2,
} from 'lucide-react';
import type { UserForManagement, GroupWithCounts } from '@/types';

interface UsersManagementProps {
  initialUsers?: UserForManagement[];
  groups?: GroupWithCounts[];
}

interface UserFormData {
  email: string;
  name: string;
  password: string;
  permissionLevel: string;
  isActive: boolean;
  isSuperUser: boolean;
  groupIds: string[];
}

const defaultFormData: UserFormData = {
  email: '',
  name: '',
  password: '',
  permissionLevel: 'view',
  isActive: true,
  isSuperUser: false,
  groupIds: [],
};

export function UsersManagement({ initialUsers = [], groups = [] }: UsersManagementProps) {
  const [users, setUsers] = React.useState<UserForManagement[]>(initialUsers);
  const [availableGroups, setAvailableGroups] = React.useState<GroupWithCounts[]>(groups);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = React.useState<UserForManagement | null>(null);
  const [formData, setFormData] = React.useState<UserFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<UserForManagement | null>(null);

  // Super user confirmation dialog
  const [superUserDialogOpen, setSuperUserDialogOpen] = React.useState(false);

  // Fetch users
  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/access-control/users?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setUsers(data.data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  // Fetch groups
  const fetchGroups = React.useCallback(async () => {
    try {
      const response = await fetch('/api/access-control/groups');
      const data = await response.json();

      if (data.success) {
        setAvailableGroups(data.data.groups);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, [fetchUsers, fetchGroups]);

  // Handle opening create dialog
  const handleOpenCreate = () => {
    setFormData(defaultFormData);
    setSelectedUser(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  // Handle opening edit dialog
  const handleOpenEdit = (user: UserForManagement) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      permissionLevel: user.permissionLevel,
      isActive: user.isActive,
      isSuperUser: user.isSuperUser,
      groupIds: user.groups.map((g) => g.id),
    });
    setDialogMode('edit');
    setDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Show confirmation for super user promotion
    if (dialogMode === 'create' && formData.isSuperUser) {
      setSuperUserDialogOpen(true);
      return;
    }

    if (
      dialogMode === 'edit' &&
      formData.isSuperUser &&
      selectedUser &&
      !selectedUser.isSuperUser
    ) {
      setSuperUserDialogOpen(true);
      return;
    }

    await submitForm();
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url =
        dialogMode === 'create'
          ? '/api/access-control/users'
          : `/api/access-control/users/${selectedUser?.id}`;

      const method = dialogMode === 'create' ? 'POST' : 'PUT';

      const body: Record<string, unknown> = {
        email: formData.email,
        name: formData.name,
        permissionLevel: formData.permissionLevel,
        isActive: formData.isActive,
        isSuperUser: formData.isSuperUser,
        groupIds: formData.groupIds,
      };

      if (formData.password) {
        body.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save user');
      }

      setSuccess(
        dialogMode === 'create' ? 'User created successfully' : 'User updated successfully'
      );
      setDialogOpen(false);
      setSuperUserDialogOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!userToDelete) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/access-control/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setSuccess('User deleted successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle group membership in form
  const toggleGroup = (groupId: string) => {
    setFormData((prev) => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter((id) => id !== groupId)
        : [...prev.groupIds, groupId],
    }));
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
              <Shield className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Create, edit, and manage user accounts and their group memberships
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
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

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Groups</TableHead>
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
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.name}
                        {user.isSuperUser && (
                          <Badge variant="default" className="bg-primary">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Super User
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500 border-gray-400">
                          <UserX className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.groups.length > 0 ? (
                          user.groups.map((group) => (
                            <Badge key={group.id} variant="secondary" className="text-xs">
                              {group.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No groups</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {dialogMode === 'create' ? 'Add New User' : 'Edit User'}
              </DialogTitle>
              <DialogDescription>
                {dialogMode === 'create'
                  ? 'Create a new user account with group memberships'
                  : 'Update user details and group memberships'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {dialogMode === 'edit' && '(leave blank to keep current)'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required={dialogMode === 'create'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="permissionLevel">Permission Level</Label>
                <Select
                  value={formData.permissionLevel}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, permissionLevel: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="write">View & Write</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="rounded"
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Active
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isSuperUser"
                    checked={formData.isSuperUser}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isSuperUser: e.target.checked }))
                    }
                    className="rounded"
                  />
                  <Label htmlFor="isSuperUser" className="cursor-pointer">
                    Super User
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Group Memberships</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {availableGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No groups available</p>
                  ) : (
                    availableGroups.map((group) => (
                      <div key={group.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`group-${group.id}`}
                          checked={formData.groupIds.includes(group.id)}
                          onChange={() => toggleGroup(group.id)}
                          className="rounded"
                        />
                        <Label htmlFor={`group-${group.id}`} className="cursor-pointer text-sm">
                          {group.name}
                          {group.isSystem && (
                            <span className="text-muted-foreground ml-1">(System)</span>
                          )}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
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
                  {dialogMode === 'create' ? 'Create User' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{userToDelete?.name}</strong>? This
                action cannot be undone and will remove all associated data.
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
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Super User Confirmation Dialog */}
        <Dialog open={superUserDialogOpen} onOpenChange={setSuperUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Super User Status</DialogTitle>
              <DialogDescription>
                You are about to grant super user privileges. Super users have unrestricted
                access to all pages and components, regardless of group permissions. Are you
                sure you want to continue?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSuperUserDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm Super User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
