'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TeamMemberForm } from './team-member-form';
import type { TeamMember, TeamMemberStatus, Vendor, Role } from '@/types';

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

interface TeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TeamMemberFormData) => void;
  isLoading?: boolean;
  teamMember?: TeamMember | null;
  mode: 'create' | 'edit';
  vendors: Vendor[];
  roles: Role[];
}

/**
 * Dialog component for creating or editing team members
 */
export function TeamMemberDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  teamMember,
  mode,
  vendors,
  roles,
}: TeamMemberDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" data-testid="team-member-dialog">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit Team Member' : 'Add New Team Member'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Update the team member information below.'
              : 'Fill in the details to add a new team member.'}
          </DialogDescription>
        </DialogHeader>
        <TeamMemberForm
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
          initialData={teamMember ?? undefined}
          mode={mode}
          vendors={vendors}
          roles={roles}
        />
      </DialogContent>
    </Dialog>
  );
}
