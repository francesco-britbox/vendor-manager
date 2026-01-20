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
  Trash2,
  Link2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

/**
 * Interface for vendor assignment data
 */
interface VendorAssignment {
  id: string;
  userId: string;
  vendorId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
  vendor: {
    id: string;
    name: string;
    status: string;
  };
}

/**
 * Interface for user dropdown option
 */
interface UserOption {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

/**
 * Interface for vendor dropdown option
 */
interface VendorOption {
  id: string;
  name: string;
  status: string;
}

const ITEMS_PER_PAGE = 50;

export function VendorAssignments() {
  // Data state
  const [assignments, setAssignments] = React.useState<VendorAssignment[]>([]);
  const [users, setUsers] = React.useState<UserOption[]>([]);
  const [vendors, setVendors] = React.useState<VendorOption[]>([]);
  const [total, setTotal] = React.useState(0);

  // UI state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Dialog state for creating assignment
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState('');
  const [selectedVendorId, setSelectedVendorId] = React.useState('');
  const [userSearch, setUserSearch] = React.useState('');
  const [vendorSearch, setVendorSearch] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = React.useState<VendorAssignment | null>(null);

  // Sort state
  const [sortColumn, setSortColumn] = React.useState<string>('createdAt');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  // Fetch assignments
  const fetchAssignments = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      params.set('limit', ITEMS_PER_PAGE.toString());
      params.set('offset', ((currentPage - 1) * ITEMS_PER_PAGE).toString());

      const response = await fetch(`/api/access-control/vendor-assignments?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch vendor assignments');
      }

      setAssignments(data.data.assignments);
      setTotal(data.data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vendor assignments');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, currentPage]);

  // Fetch users for dropdown
  const fetchUsers = React.useCallback(async () => {
    try {
      const response = await fetch('/api/access-control/users?status=active&limit=1000');
      const data = await response.json();

      if (data.success) {
        setUsers(
          data.data.users.map((user: UserOption) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            isActive: user.isActive,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  // Fetch vendors for dropdown
  const fetchVendors = React.useCallback(async () => {
    try {
      const response = await fetch('/api/vendors?status=active&limit=1000');
      const data = await response.json();

      if (data.success) {
        setVendors(
          data.data.vendors.map((vendor: VendorOption) => ({
            id: vendor.id,
            name: vendor.name,
            status: vendor.status,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  }, []);

  React.useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  React.useEffect(() => {
    fetchUsers();
    fetchVendors();
  }, [fetchUsers, fetchVendors]);

  // Handle opening create dialog
  const handleOpenCreate = () => {
    setSelectedUserId('');
    setSelectedVendorId('');
    setUserSearch('');
    setVendorSearch('');
    setCreateDialogOpen(true);
  };

  // Handle creating assignment
  const handleCreate = async () => {
    if (!selectedUserId || !selectedVendorId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/access-control/vendor-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          vendorId: selectedVendorId,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create vendor assignment');
      }

      setSuccess('Vendor assigned successfully');
      setCreateDialogOpen(false);
      setSelectedUserId('');
      setSelectedVendorId('');
      fetchAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vendor assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (assignment: VendorAssignment) => {
    setAssignmentToDelete(assignment);
    setDeleteDialogOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!assignmentToDelete) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/access-control/vendor-assignments/${assignmentToDelete.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove vendor assignment');
      }

      setSuccess('Vendor assignment removed');
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
      fetchAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove vendor assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort assignments client-side
  const sortedAssignments = React.useMemo(() => {
    const sorted = [...assignments];
    sorted.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case 'userName':
          aValue = a.user.name.toLowerCase();
          bValue = b.user.name.toLowerCase();
          break;
        case 'userEmail':
          aValue = a.user.email.toLowerCase();
          bValue = b.user.email.toLowerCase();
          break;
        case 'vendorName':
          aValue = a.vendor.name.toLowerCase();
          bValue = b.vendor.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [assignments, sortColumn, sortDirection]);

  // Format date as MM/DD/YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Filter users for dropdown based on search
  const filteredUsers = React.useMemo(() => {
    if (!userSearch) return users;
    const searchLower = userSearch.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
    );
  }, [users, userSearch]);

  // Filter vendors for dropdown based on search
  const filteredVendors = React.useMemo(() => {
    if (!vendorSearch) return vendors;
    const searchLower = vendorSearch.toLowerCase();
    return vendors.filter((vendor) => vendor.name.toLowerCase().includes(searchLower));
  }, [vendors, vendorSearch]);

  // Pagination
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Get sort indicator
  const getSortIndicator = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? ' \u2191' : ' \u2193';
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

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Vendor Assignments
            </CardTitle>
            <CardDescription>
              Manage vendor-to-user assignments for delivery reporting
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Assignment
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        {error && (
          <div className="rounded-md bg-destructive/15 p-4 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={fetchAssignments}
            >
              Retry
            </Button>
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-500/15 p-4 text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user name, email, or vendor name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Assignments Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('userName')}
                >
                  User Name{getSortIndicator('userName')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('userEmail')}
                >
                  User Email{getSortIndicator('userEmail')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('vendorName')}
                >
                  Vendor Name{getSortIndicator('vendorName')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('createdAt')}
                >
                  Assigned Date{getSortIndicator('createdAt')}
                </TableHead>
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
              ) : sortedAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? 'No assignments found matching your search'
                      : 'No vendor assignments exist. Click "Add Assignment" to create one.'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {assignment.user.name}
                        {!assignment.user.isActive && (
                          <Badge variant="outline" className="text-gray-500 border-gray-400">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{assignment.user.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {assignment.vendor.name}
                        {assignment.vendor.status !== 'active' && (
                          <Badge variant="outline" className="text-gray-500 border-gray-400">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(assignment.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(assignment)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, total)} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} assignments
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Create Assignment Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Vendor Assignment</DialogTitle>
              <DialogDescription>
                Assign a vendor to a user for delivery reporting. The user will be able to create
                reports for the assigned vendor.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* User Selection */}
              <div className="space-y-2">
                <Label htmlFor="user-search">User</Label>
                <Input
                  id="user-search"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3">No active users found</p>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                          selectedUserId === user.id ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    ))
                  )}
                </div>
                {selectedUserId && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {users.find((u) => u.id === selectedUserId)?.name}
                  </p>
                )}
              </div>

              {/* Vendor Selection */}
              <div className="space-y-2">
                <Label htmlFor="vendor-search">Vendor</Label>
                <Input
                  id="vendor-search"
                  placeholder="Search vendors..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                />
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredVendors.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3">No active vendors found</p>
                  ) : (
                    filteredVendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                          selectedVendorId === vendor.id ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => setSelectedVendorId(vendor.id)}
                      >
                        <div className="font-medium">{vendor.name}</div>
                      </div>
                    ))
                  )}
                </div>
                {selectedVendorId && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {vendors.find((v) => v.id === selectedVendorId)?.name}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isSubmitting || !selectedUserId || !selectedVendorId}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Vendor Assignment</DialogTitle>
              <DialogDescription>
                Remove vendor assignment for <strong>{assignmentToDelete?.user.name}</strong>? This
                will not delete existing reports, but {assignmentToDelete?.user.name} will no longer
                be able to create new reports for <strong>{assignmentToDelete?.vendor.name}</strong>.
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
                Remove Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
