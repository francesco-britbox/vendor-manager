'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Mail, Building2, Users } from 'lucide-react';
import type { TeamMember, TeamMemberStatus } from '@/types';

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

interface TeamMemberTableProps {
  teamMembers: TeamMemberWithRelations[];
  onEdit?: (teamMember: TeamMemberWithRelations) => void;
  onDelete?: (id: string) => void;
  isDeleting?: string | null;
}

/**
 * Format a date for display
 */
function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  }).format(new Date(date));
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Get status badge styling
 */
function getStatusBadgeClass(status: TeamMemberStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'inactive':
      return 'bg-gray-100 text-gray-700';
    case 'onboarding':
      return 'bg-blue-100 text-blue-700';
    case 'offboarded':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Get status display text
 */
function getStatusDisplayText(status: TeamMemberStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'onboarding':
      return 'Onboarding';
    case 'offboarded':
      return 'Offboarded';
    default:
      return status;
  }
}

/**
 * Table component for displaying team members
 */
export function TeamMemberTable({
  teamMembers,
  onEdit,
  onDelete,
  isDeleting,
}: TeamMemberTableProps) {
  if (teamMembers.length === 0) {
    return (
      <div
        className="rounded-md border p-8 text-center"
        data-testid="team-member-table-empty"
      >
        <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">
          No team members found. Add your first team member to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border" data-testid="team-member-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Daily Rate</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Utilization</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamMembers.map((member) => (
            <TableRow key={member.id} data-testid={`team-member-row-${member.id}`}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span data-testid={`team-member-name-${member.id}`}>
                    {member.firstName} {member.lastName}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {member.email}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {member.vendor ? (
                  <div className="flex items-center gap-1 text-sm">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span>{member.vendor.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {member.role ? (
                  <span className="text-sm">{member.role.name}</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm font-medium">
                  {formatCurrency(member.dailyRate, member.currency)}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(member.startDate)}
                {member.endDate && (
                  <span className="block text-xs">
                    to {formatDate(member.endDate)}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(
                    member.status
                  )}`}
                  data-testid={`team-member-status-${member.id}`}
                >
                  {getStatusDisplayText(member.status)}
                </span>
              </TableCell>
              <TableCell>
                {member.plannedUtilization !== undefined ? (
                  <span className="text-sm">{member.plannedUtilization}%</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(member)}
                      data-testid={`edit-team-member-${member.id}`}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(member.id)}
                      disabled={isDeleting === member.id}
                      data-testid={`delete-team-member-${member.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
