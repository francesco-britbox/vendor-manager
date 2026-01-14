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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardSettings } from '@/types';
import { LayoutDashboard, Save } from 'lucide-react';

interface DashboardSettingsFormProps {
  settings: DashboardSettings;
  onSubmit: (settings: Partial<DashboardSettings>) => Promise<void>;
  isLoading?: boolean;
}

const DEFAULT_VIEWS: { value: DashboardSettings['defaultView']; label: string; description: string }[] = [
  { value: 'overview', label: 'Overview', description: 'Summary view with key metrics' },
  { value: 'detailed', label: 'Detailed', description: 'Comprehensive view with all data' },
  { value: 'compact', label: 'Compact', description: 'Minimalist view with essential info' },
];

const REFRESH_INTERVALS: { value: number; label: string }[] = [
  { value: 0, label: 'No auto-refresh' },
  { value: 30, label: 'Every 30 seconds' },
  { value: 60, label: 'Every minute' },
  { value: 300, label: 'Every 5 minutes' },
  { value: 600, label: 'Every 10 minutes' },
];

export function DashboardSettingsForm({ settings, onSubmit, isLoading }: DashboardSettingsFormProps) {
  const [formData, setFormData] = React.useState<DashboardSettings>(settings);

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (field: keyof DashboardSettings, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5" />
          Dashboard Preferences
        </CardTitle>
        <CardDescription>
          Configure how the dashboard appears and behaves for all users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultView">Default View</Label>
              <Select
                value={formData.defaultView}
                onValueChange={(value) => handleChange('defaultView', value as DashboardSettings['defaultView'])}
              >
                <SelectTrigger id="defaultView" data-testid="default-view-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_VIEWS.map((view) => (
                    <SelectItem key={view.value} value={view.value}>
                      {view.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {DEFAULT_VIEWS.find((v) => v.value === formData.defaultView)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refreshInterval">Auto-Refresh Interval</Label>
              <Select
                value={String(formData.refreshInterval)}
                onValueChange={(value) => handleChange('refreshInterval', parseInt(value))}
              >
                <SelectTrigger id="refreshInterval" data-testid="refresh-interval-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFRESH_INTERVALS.map((interval) => (
                    <SelectItem key={interval.value} value={String(interval.value)}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How often the dashboard refreshes automatically
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activityItemsCount">Activity Items to Show</Label>
              <Input
                id="activityItemsCount"
                type="number"
                min={1}
                max={50}
                value={formData.activityItemsCount}
                onChange={(e) => handleChange('activityItemsCount', parseInt(e.target.value) || 10)}
                data-testid="activity-items-input"
              />
              <p className="text-xs text-muted-foreground">
                Number of recent activity items to display (1-50)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiringContractsDays">Contract Expiry Warning (Days)</Label>
              <Input
                id="expiringContractsDays"
                type="number"
                min={1}
                max={365}
                value={formData.expiringContractsDays}
                onChange={(e) => handleChange('expiringContractsDays', parseInt(e.target.value) || 30)}
                data-testid="expiring-contracts-days-input"
              />
              <p className="text-xs text-muted-foreground">
                Show contracts expiring within this many days
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showRecentActivity"
                checked={formData.showRecentActivity}
                onChange={(e) => handleChange('showRecentActivity', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
                data-testid="show-recent-activity-checkbox"
              />
              <Label htmlFor="showRecentActivity" className="text-sm font-normal">
                Show recent activity feed on dashboard
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showExpiringContracts"
                checked={formData.showExpiringContracts}
                onChange={(e) => handleChange('showExpiringContracts', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
                data-testid="show-expiring-contracts-checkbox"
              />
              <Label htmlFor="showExpiringContracts" className="text-sm font-normal">
                Show expiring contracts warning on dashboard
              </Label>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} data-testid="save-dashboard-settings">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Dashboard Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
