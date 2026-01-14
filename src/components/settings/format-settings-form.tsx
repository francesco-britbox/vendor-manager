'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FormatSettings, DateFormat, NumberFormat } from '@/types';
import { Calendar, Save } from 'lucide-react';

interface FormatSettingsFormProps {
  settings: FormatSettings;
  onSubmit: (settings: Partial<FormatSettings>) => Promise<void>;
  isLoading?: boolean;
}

const DATE_FORMATS: { value: DateFormat; label: string; example: string }[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' },
];

const NUMBER_FORMATS: { value: NumberFormat; label: string; example: string }[] = [
  { value: 'en-US', label: 'US (1,234.56)', example: '1,234.56' },
  { value: 'en-GB', label: 'UK (1,234.56)', example: '1,234.56' },
  { value: 'de-DE', label: 'German (1.234,56)', example: '1.234,56' },
  { value: 'fr-FR', label: 'French (1 234,56)', example: '1 234,56' },
];

const WEEK_STARTS: { value: 0 | 1 | 6; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 6, label: 'Saturday' },
];

// Common timezones
const TIMEZONES = [
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export function FormatSettingsForm({ settings, onSubmit, isLoading }: FormatSettingsFormProps) {
  const [formData, setFormData] = React.useState<FormatSettings>(settings);

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (field: keyof FormatSettings, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Date & Number Formats
        </CardTitle>
        <CardDescription>
          Configure how dates and numbers are formatted throughout the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={formData.dateFormat}
                onValueChange={(value) => handleChange('dateFormat', value as DateFormat)}
              >
                <SelectTrigger id="dateFormat" data-testid="date-format-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label} ({format.example})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How dates are displayed across the system
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberFormat">Number Format</Label>
              <Select
                value={formData.numberFormat}
                onValueChange={(value) => handleChange('numberFormat', value as NumberFormat)}
              >
                <SelectTrigger id="numberFormat" data-testid="number-format-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NUMBER_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How numbers are formatted (decimal and thousands separators)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleChange('timezone', value)}
              >
                <SelectTrigger id="timezone" data-testid="timezone-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default timezone for the application
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekStartsOn">Week Starts On</Label>
              <Select
                value={String(formData.weekStartsOn)}
                onValueChange={(value) => handleChange('weekStartsOn', parseInt(value) as 0 | 1 | 6)}
              >
                <SelectTrigger id="weekStartsOn" data-testid="week-starts-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_STARTS.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                First day of the week for calendar displays
              </p>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} data-testid="save-format-settings">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Format Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
