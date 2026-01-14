'use client';

import * as React from 'react';
import { CurrencySettingsForm } from './currency-settings-form';
import { FormatSettingsForm } from './format-settings-form';
import { DashboardSettingsForm } from './dashboard-settings-form';
import { IntegrationSettingsForm } from './integration-settings-form';
import { AdminGuard } from '@/components/permissions/permission-guard';
import { AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import type {
  SystemSettings,
  CurrencySettings,
  FormatSettings,
  DashboardSettings,
  IntegrationSettings,
} from '@/types';
import {
  DEFAULT_CURRENCY_SETTINGS,
  DEFAULT_FORMAT_SETTINGS,
  DEFAULT_DASHBOARD_SETTINGS,
  DEFAULT_INTEGRATION_SETTINGS,
} from '@/types';

interface SettingsConfigProps {
  initialSettings?: SystemSettings;
}

export function SettingsConfig({ initialSettings }: SettingsConfigProps) {
  const [settings, setSettings] = React.useState<SystemSettings>(
    initialSettings || {
      currency: DEFAULT_CURRENCY_SETTINGS,
      formats: DEFAULT_FORMAT_SETTINGS,
      dashboard: DEFAULT_DASHBOARD_SETTINGS,
      integrations: DEFAULT_INTEGRATION_SETTINGS,
    }
  );
  const [isLoading, setIsLoading] = React.useState<Record<string, boolean>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Fetch settings on mount if not provided
  React.useEffect(() => {
    if (!initialSettings) {
      fetchSettings();
    }
  }, [initialSettings]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
      } else {
        setError(data.error || 'Failed to fetch settings');
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError('Failed to fetch settings. Please try again.');
    }
  };

  const handleUpdateCategory = async <T extends keyof SystemSettings>(
    category: T,
    newSettings: Partial<SystemSettings[T]>
  ): Promise<void> => {
    setIsLoading((prev) => ({ ...prev, [category]: true }));
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/settings/${category}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update settings');
      }

      // Update local state with new settings
      setSettings((prev) => ({
        ...prev,
        [category]: data.data,
      }));

      setSuccess(`${getCategoryLabel(category)} settings updated successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsLoading((prev) => ({ ...prev, [category]: false }));
    }
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      currency: 'Currency',
      formats: 'Format',
      dashboard: 'Dashboard',
      integrations: 'Integration',
    };
    return labels[category] || category;
  };

  const handleCurrencySubmit = async (newSettings: Partial<CurrencySettings>) => {
    await handleUpdateCategory('currency', newSettings);
  };

  const handleFormatSubmit = async (newSettings: Partial<FormatSettings>) => {
    await handleUpdateCategory('formats', newSettings);
  };

  const handleDashboardSubmit = async (newSettings: Partial<DashboardSettings>) => {
    await handleUpdateCategory('dashboard', newSettings);
  };

  const handleIntegrationSubmit = async (newSettings: Partial<IntegrationSettings>) => {
    await handleUpdateCategory('integrations', newSettings);
  };

  return (
    <AdminGuard
      fallback={
        <div className="rounded-md bg-destructive/15 p-4 text-destructive flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <span>Admin access required to view and modify system settings.</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Notification Messages */}
        {error && (
          <div className="rounded-md bg-destructive/15 p-4 text-destructive flex items-center gap-2" data-testid="settings-error">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-500/15 p-4 text-green-700 flex items-center gap-2" data-testid="settings-success">
            <CheckCircle2 className="h-5 w-5" />
            <span>{success}</span>
          </div>
        )}

        {/* Currency Settings */}
        <CurrencySettingsForm
          settings={settings.currency}
          onSubmit={handleCurrencySubmit}
          isLoading={isLoading.currency}
        />

        {/* Format Settings */}
        <FormatSettingsForm
          settings={settings.formats}
          onSubmit={handleFormatSubmit}
          isLoading={isLoading.formats}
        />

        {/* Dashboard Settings */}
        <DashboardSettingsForm
          settings={settings.dashboard}
          onSubmit={handleDashboardSubmit}
          isLoading={isLoading.dashboard}
        />

        {/* Integration Settings */}
        <IntegrationSettingsForm
          settings={settings.integrations}
          onSubmit={handleIntegrationSubmit}
          isLoading={isLoading.integrations}
        />
      </div>
    </AdminGuard>
  );
}
