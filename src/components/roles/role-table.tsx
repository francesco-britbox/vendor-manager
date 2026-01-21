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
import { Trash2, Pencil, Users, FileText } from 'lucide-react';
import type { RoleWithUsage } from '@/lib/roles';
import { ComponentGuard } from '@/components/permissions/rbac-guard';

interface RoleTableProps {
  roles: RoleWithUsage[];
  onEdit: (role: RoleWithUsage) => void;
  onDelete: (id: string) => void;
  isDeleting?: string | null;
}

/**
 * Format a date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  }).format(new Date(date));
}

/**
 * Table component for displaying roles with their usage counts
 */
export function RoleTable({
  roles,
  onEdit,
  onDelete,
  isDeleting,
}: RoleTableProps) {
  if (roles.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center" data-testid="empty-roles-message">
        <p className="text-muted-foreground">
          No roles configured yet. Add your first role above.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-center">Team Members</TableHead>
            <TableHead className="text-center">Rate Cards</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id} data-testid={`role-row-${role.id}`}>
              <TableCell className="font-medium" data-testid={`role-name-${role.id}`}>
                {role.name}
              </TableCell>
              <TableCell className="max-w-[300px]">
                {role.description ? (
                  <span className="line-clamp-2 text-sm text-muted-foreground">
                    {role.description}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    No description
                  </span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{role.teamMemberCount}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{role.rateCardCount}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDate(role.createdAt)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(role)}
                    disabled={isDeleting === role.id}
                    data-testid={`edit-role-${role.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <ComponentGuard componentKey="role-delete">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(role.id)}
                      disabled={isDeleting === role.id || role.teamMemberCount > 0 || role.rateCardCount > 0}
                      title={
                        role.teamMemberCount > 0 || role.rateCardCount > 0
                          ? 'Cannot delete role in use'
                          : 'Delete role'
                      }
                      data-testid={`delete-role-${role.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </ComponentGuard>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
