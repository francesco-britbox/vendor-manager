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
import type { IntegrationSettings } from '@/types';
import { Plug, Save, AlertTriangle } from 'lucide-react';

interface IntegrationSettingsFormProps {
  settings: IntegrationSettings;
  onSubmit: (settings: Partial<IntegrationSettings>) => Promise<void>;
  isLoading?: boolean;
}

const EXCHANGE_RATE_PROVIDERS: { value: IntegrationSettings['exchangeRateApi']['provider']; label: string; description: string }[] = [
  { value: 'manual', label: 'Manual Entry', description: 'Manually enter exchange rates' },
  { value: 'openexchangerates', label: 'Open Exchange Rates', description: 'Automatic rates from openexchangerates.org' },
  { value: 'exchangerateapi', label: 'ExchangeRate-API', description: 'Automatic rates from exchangerate-api.com' },
];

const UPDATE_INTERVALS: { value: number; label: string }[] = [
  { value: 1, label: 'Every hour' },
  { value: 6, label: 'Every 6 hours' },
  { value: 12, label: 'Every 12 hours' },
  { value: 24, label: 'Daily' },
  { value: 168, label: 'Weekly' },
];

export function IntegrationSettingsForm({ settings, onSubmit, isLoading }: IntegrationSettingsFormProps) {
  const [formData, setFormData] = React.useState<IntegrationSettings>(settings);

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleExchangeRateChange = (field: keyof IntegrationSettings['exchangeRateApi'], value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      exchangeRateApi: { ...prev.exchangeRateApi, [field]: value },
    }));
  };

  const handleNotificationChange = (field: keyof IntegrationSettings['notifications'], value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [field]: value },
    }));
  };

  const showApiKeyField = formData.exchangeRateApi.provider !== 'manual' && formData.exchangeRateApi.enabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Integration Settings
        </CardTitle>
        <CardDescription>
          Configure external service integrations and notifications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Exchange Rate API Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Exchange Rate API</h3>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="exchangeRateEnabled"
                checked={formData.exchangeRateApi.enabled}
                onChange={(e) => handleExchangeRateChange('enabled', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
                data-testid="exchange-rate-enabled-checkbox"
              />
              <Label htmlFor="exchangeRateEnabled" className="text-sm font-normal">
                Enable automatic exchange rate updates
              </Label>
            </div>

            {formData.exchangeRateApi.enabled && (
              <div className="grid gap-4 md:grid-cols-2 pl-6 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label htmlFor="exchangeRateProvider">Provider</Label>
                  <Select
                    value={formData.exchangeRateApi.provider}
                    onValueChange={(value) => handleExchangeRateChange('provider', value as IntegrationSettings['exchangeRateApi']['provider'])}
                  >
                    <SelectTrigger id="exchangeRateProvider" data-testid="exchange-rate-provider-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXCHANGE_RATE_PROVIDERS.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {EXCHANGE_RATE_PROVIDERS.find((p) => p.value === formData.exchangeRateApi.provider)?.description}
                  </p>
                </div>

                {showApiKeyField && (
                  <div className="space-y-2">
                    <Label htmlFor="exchangeRateApiKey">API Key</Label>
                    <Input
                      id="exchangeRateApiKey"
                      type="password"
                      value={formData.exchangeRateApi.apiKey || ''}
                      onChange={(e) => handleExchangeRateChange('apiKey', e.target.value)}
                      placeholder="Enter your API key"
                      data-testid="exchange-rate-api-key-input"
                    />
                    <p className="text-xs text-muted-foreground">
                      Required for external providers
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="exchangeRateAutoUpdate"
                    checked={formData.exchangeRateApi.autoUpdate}
                    onChange={(e) => handleExchangeRateChange('autoUpdate', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="exchange-rate-auto-update-checkbox"
                  />
                  <Label htmlFor="exchangeRateAutoUpdate" className="text-sm font-normal">
                    Automatically update rates on schedule
                  </Label>
                </div>

                {formData.exchangeRateApi.autoUpdate && (
                  <div className="space-y-2">
                    <Label htmlFor="exchangeRateUpdateInterval">Update Interval</Label>
                    <Select
                      value={String(formData.exchangeRateApi.updateInterval)}
                      onValueChange={(value) => handleExchangeRateChange('updateInterval', parseInt(value))}
                    >
                      <SelectTrigger id="exchangeRateUpdateInterval" data-testid="exchange-rate-update-interval-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UPDATE_INTERVALS.map((interval) => (
                          <SelectItem key={interval.value} value={String(interval.value)}>
                            {interval.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notifications Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notifications</h3>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="emailEnabled"
                checked={formData.notifications.emailEnabled}
                onChange={(e) => handleNotificationChange('emailEnabled', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
                data-testid="email-enabled-checkbox"
              />
              <Label htmlFor="emailEnabled" className="text-sm font-normal">
                Enable email notifications
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="slackEnabled"
                checked={formData.notifications.slackEnabled}
                onChange={(e) => handleNotificationChange('slackEnabled', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
                data-testid="slack-enabled-checkbox"
              />
              <Label htmlFor="slackEnabled" className="text-sm font-normal">
                Enable Slack notifications
              </Label>
            </div>

            {formData.notifications.slackEnabled && (
              <div className="space-y-2 pl-6 border-l-2 border-muted">
                <Label htmlFor="slackWebhookUrl">Slack Webhook URL</Label>
                <Input
                  id="slackWebhookUrl"
                  type="url"
                  value={formData.notifications.slackWebhookUrl || ''}
                  onChange={(e) => handleNotificationChange('slackWebhookUrl', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  data-testid="slack-webhook-url-input"
                />
                <p className="text-xs text-muted-foreground">
                  Webhook URL for Slack notifications
                </p>
              </div>
            )}
          </div>

          {/* Warning for sensitive data */}
          <div className="rounded-md bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Security Notice</p>
              <p>API keys and webhook URLs are sensitive. Ensure only trusted administrators have access to these settings.</p>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} data-testid="save-integration-settings">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Integration Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
