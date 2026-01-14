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
import { TeamMemberTable } from './team-member-table';
import { TeamMemberDialog } from './team-member-dialog';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  UserMinus,
  Upload,
} from 'lucide-react';
import { CSVImportDialog } from '@/components/import/csv-import-dialog';
import type { TeamMember, TeamMemberStatus, Vendor, Role } from '@/types';

interface TeamMemberWithRelations extends TeamMember {
  vendor?: {
    id: string;
    name: string;
  };
  role?: {
    id: string;
    name: string;
  };
}

interface TeamMemberStats {
  totalTeamMembers: number;
  activeTeamMembers: number;
  inactiveTeamMembers: number;
  onboardingTeamMembers: number;
  offboardedTeamMembers: number;
}

interface TeamMemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  vendorId: string;
  roleId: string;
  dailyRate: number;
  currency: string;
  startDate: string;
  endDate?: string;
  status: TeamMemberStatus;
  plannedUtilization?: number;
}

interface TeamMemberConfigProps {
  initialTeamMembers?: TeamMemberWithRelations[];
  initialStats?: TeamMemberStats;
}

/**
 * Full team member configuration interface with CRUD operations
 * and statistics dashboard
 */
export function TeamMemberConfig({
  initialTeamMembers = [],
  initialStats,
}: TeamMemberConfigProps) {
  const [teamMembers, setTeamMembers] = React.useState<TeamMemberWithRelations[]>(initialTeamMembers);
  const [stats, setStats] = React.useState<TeamMemberStats | null>(
    initialStats ?? null
  );
  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>(
    'create'
  );
  const [selectedTeamMember, setSelectedTeamMember] = React.useState<TeamMemberWithRelations | null>(
    null
  );

  // Filter state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [vendorFilter, setVendorFilter] = React.useState<string>('all');

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);

  // Fetch team members, vendors, and roles on mount
  React.useEffect(() => {
    fetchTeamMembers();
    fetchVendors();
    fetchRoles();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team-members?includeStats=true');
      const data = await response.json();

      if (data.success) {
        setTeamMembers(data.data.teamMembers);
        if (data.data.stats) {
          setStats(data.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch team members:', err);
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

  const handleCreate = async (formData: TeamMemberFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create team member');
      }

      setSuccess('Team member created successfully');
      setDialogOpen(false);
      await fetchTeamMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (formData: TeamMemberFormData) => {
    if (!selectedTeamMember) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/team-members/${selectedTeamMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update team member');
      }

      setSuccess('Team member updated successfully');
      setDialogOpen(false);
      setSelectedTeamMember(null);
      await fetchTeamMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team member?')) {
      return;
    }

    setIsDeleting(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/team-members/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete team member');
      }

      setSuccess('Team member deleted successfully');
      await fetchTeamMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team member');
    } finally {
      setIsDeleting(null);
    }
  };

  const openCreateDialog = () => {
    setSelectedTeamMember(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const openEditDialog = (teamMember: TeamMemberWithRelations) => {
    setSelectedTeamMember(teamMember);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const openImportDialog = () => {
    setImportDialogOpen(true);
  };

  const handleImportComplete = async () => {
    setSuccess('Team members imported successfully');
    await fetchTeamMembers();
  };

  // Filter team members
  const filteredTeamMembers = React.useMemo(() => {
    return teamMembers.filter((member) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesName = `${member.firstName} ${member.lastName}`
          .toLowerCase()
          .includes(search);
        const matchesEmail = member.email.toLowerCase().includes(search);
        if (!matchesName && !matchesEmail) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && member.status !== statusFilter) {
        return false;
      }

      // Vendor filter
      if (vendorFilter !== 'all' && member.vendorId !== vendorFilter) {
        return false;
      }

      return true;
    });
  }, [teamMembers, searchTerm, statusFilter, vendorFilter]);

  return (
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      {stats && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
          data-testid="team-member-stats"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Total Members
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="total-team-members">
                {stats.totalTeamMembers}
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
              <p className="text-2xl font-bold" data-testid="active-team-members">
                {stats.activeTeamMembers}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  Onboarding
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="onboarding-team-members">
                {stats.onboardingTeamMembers}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-muted-foreground">
                  Inactive
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="inactive-team-members">
                {stats.inactiveTeamMembers}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <UserMinus className="h-4 w-4 text-red-400" />
                <span className="text-sm text-muted-foreground">
                  Offboarded
                </span>
              </div>
              <p className="text-2xl font-bold" data-testid="offboarded-team-members">
                {stats.offboardedTeamMembers}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notification Messages */}
      {error && (
        <div
          className="rounded-md bg-destructive/15 p-4 text-destructive"
          data-testid="team-member-error-message"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="rounded-md bg-green-500/15 p-4 text-green-700"
          data-testid="team-member-success-message"
        >
          {success}
        </div>
      )}

      {/* Team Member List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage your team members and their assignments
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={openImportDialog}
                data-testid="import-team-members-button"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button
                onClick={openCreateDialog}
                data-testid="create-team-member-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Team Member
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="team-member-search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-full md:w-[180px]"
                data-testid="team-member-status-filter"
              >
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="offboarded">Offboarded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger
                className="w-full md:w-[180px]"
                data-testid="team-member-vendor-filter"
              >
                <SelectValue placeholder="Filter by vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <TeamMemberTable
            teamMembers={filteredTeamMembers}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <TeamMemberDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedTeamMember(null);
          }
        }}
        onSubmit={dialogMode === 'edit' ? handleUpdate : handleCreate}
        isLoading={isLoading}
        teamMember={selectedTeamMember}
        mode={dialogMode}
        vendors={vendors}
        roles={roles}
      />

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={handleImportComplete}
        vendors={vendors}
        entityType="team-members"
      />
    </div>
  );
}
