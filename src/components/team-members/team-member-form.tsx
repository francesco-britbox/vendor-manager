'use client';

import * as React from 'react';
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

interface TeamMemberFormProps {
  onSubmit: (data: TeamMemberFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<TeamMember>;
  mode?: 'create' | 'edit';
  vendors: Vendor[];
  roles: Role[];
}

/**
 * Format a date to YYYY-MM-DD for input[type="date"]
 */
function formatDateForInput(date: Date | string | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Form for creating or editing team members
 */
export function TeamMemberForm({
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  mode = 'create',
  vendors,
  roles,
}: TeamMemberFormProps) {
  const [firstName, setFirstName] = React.useState(initialData?.firstName ?? '');
  const [lastName, setLastName] = React.useState(initialData?.lastName ?? '');
  const [email, setEmail] = React.useState(initialData?.email ?? '');
  const [vendorId, setVendorId] = React.useState(initialData?.vendorId ?? '');
  const [roleId, setRoleId] = React.useState(initialData?.roleId ?? '');
  const [dailyRate, setDailyRate] = React.useState<string>(
    initialData?.dailyRate?.toString() ?? ''
  );
  const [currency, setCurrency] = React.useState(initialData?.currency ?? 'GBP');
  const [startDate, setStartDate] = React.useState(
    formatDateForInput(initialData?.startDate)
  );
  const [endDate, setEndDate] = React.useState(
    formatDateForInput(initialData?.endDate)
  );
  const [status, setStatus] = React.useState<TeamMemberStatus>(
    initialData?.status ?? 'active'
  );
  const [plannedUtilization, setPlannedUtilization] = React.useState<string>(
    initialData?.plannedUtilization?.toString() ?? ''
  );
  const [error, setError] = React.useState<string | null>(null);

  // Update form when initialData changes (for edit mode)
  React.useEffect(() => {
    if (initialData) {
      setFirstName(initialData.firstName ?? '');
      setLastName(initialData.lastName ?? '');
      setEmail(initialData.email ?? '');
      setVendorId(initialData.vendorId ?? '');
      setRoleId(initialData.roleId ?? '');
      setDailyRate(initialData.dailyRate?.toString() ?? '');
      setCurrency(initialData.currency ?? 'GBP');
      setStartDate(formatDateForInput(initialData.startDate));
      setEndDate(formatDateForInput(initialData.endDate));
      setStatus(initialData.status ?? 'active');
      setPlannedUtilization(initialData.plannedUtilization?.toString() ?? '');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }

    if (firstName.length > 255) {
      setError('First name must be at most 255 characters');
      return;
    }

    if (!lastName.trim()) {
      setError('Last name is required');
      return;
    }

    if (lastName.length > 255) {
      setError('Last name must be at most 255 characters');
      return;
    }

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!vendorId) {
      setError('Please select a vendor');
      return;
    }

    if (!roleId) {
      setError('Please select a role');
      return;
    }

    const dailyRateNum = parseFloat(dailyRate);
    if (isNaN(dailyRateNum) || dailyRateNum <= 0) {
      setError('Please enter a valid daily rate');
      return;
    }

    if (!startDate) {
      setError('Start date is required');
      return;
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      setError('End date must be after start date');
      return;
    }

    const utilization = plannedUtilization ? parseFloat(plannedUtilization) : undefined;
    if (utilization !== undefined && (utilization < 0 || utilization > 100)) {
      setError('Planned utilization must be between 0 and 100');
      return;
    }

    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      vendorId,
      roleId,
      dailyRate: dailyRateNum,
      currency,
      startDate,
      endDate: endDate || undefined,
      status,
      plannedUtilization: utilization,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="team-member-form">
      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstName"
            type="text"
            placeholder="Enter first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            data-testid="team-member-first-name-input"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Enter last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            data-testid="team-member-last-name-input"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="team-member-email-input"
          disabled={isLoading}
        />
      </div>

      {/* Vendor and Role Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vendorId">
            Vendor <span className="text-destructive">*</span>
          </Label>
          <Select
            value={vendorId}
            onValueChange={setVendorId}
            disabled={isLoading}
          >
            <SelectTrigger data-testid="team-member-vendor-select">
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="roleId">
            Role <span className="text-destructive">*</span>
          </Label>
          <Select
            value={roleId}
            onValueChange={setRoleId}
            disabled={isLoading}
          >
            <SelectTrigger data-testid="team-member-role-select">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Daily Rate and Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dailyRate">
            Daily Rate <span className="text-destructive">*</span>
          </Label>
          <Input
            id="dailyRate"
            type="number"
            step="0.01"
            min="0"
            placeholder="Enter daily rate"
            value={dailyRate}
            onChange={(e) => setDailyRate(e.target.value)}
            data-testid="team-member-daily-rate-input"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={currency}
            onValueChange={setCurrency}
            disabled={isLoading}
          >
            <SelectTrigger data-testid="team-member-currency-select">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GBP">GBP - British Pound</SelectItem>
              <SelectItem value="USD">USD - US Dollar</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Start and End Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">
            Start Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            data-testid="team-member-start-date-input"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            data-testid="team-member-end-date-input"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Status and Utilization */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(value: TeamMemberStatus) => setStatus(value)}
            disabled={isLoading}
          >
            <SelectTrigger data-testid="team-member-status-select">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="offboarded">Offboarded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plannedUtilization">Planned Utilization (%)</Label>
          <Input
            id="plannedUtilization"
            type="number"
            step="1"
            min="0"
            max="100"
            placeholder="0-100"
            value={plannedUtilization}
            onChange={(e) => setPlannedUtilization(e.target.value)}
            data-testid="team-member-utilization-input"
            disabled={isLoading}
          />
        </div>
      </div>

      {error && (
        <div
          className="rounded-md bg-destructive/15 p-3 text-sm text-destructive"
          data-testid="team-member-form-error"
        >
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="team-member-form-cancel"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading} data-testid="team-member-form-submit">
          {isLoading
            ? 'Saving...'
            : mode === 'edit'
            ? 'Update Team Member'
            : 'Create Team Member'}
        </Button>
      </div>
    </form>
  );
}
