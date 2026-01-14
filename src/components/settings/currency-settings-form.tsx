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
import { CurrencySelect } from '@/components/currency/currency-select';
import type { CurrencySettings, RoundingMode } from '@/types';
import { Coins, Save } from 'lucide-react';

interface CurrencySettingsFormProps {
  settings: CurrencySettings;
  onSubmit: (settings: Partial<CurrencySettings>) => Promise<void>;
  isLoading?: boolean;
}

const ROUNDING_MODES: { value: RoundingMode; label: string; description: string }[] = [
  { value: 'HALF_UP', label: 'Half Up', description: 'Standard rounding (0.5 rounds up)' },
  { value: 'HALF_DOWN', label: 'Half Down', description: '0.5 rounds down' },
  { value: 'UP', label: 'Round Up', description: 'Always round up' },
  { value: 'DOWN', label: 'Round Down', description: 'Always round down' },
  { value: 'HALF_EVEN', label: "Banker's Rounding", description: '0.5 rounds to even number' },
];

export function CurrencySettingsForm({ settings, onSubmit, isLoading }: CurrencySettingsFormProps) {
  const [formData, setFormData] = React.useState<CurrencySettings>(settings);

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (field: keyof CurrencySettings, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Currency Settings
        </CardTitle>
        <CardDescription>
          Configure how currency values are displayed and calculated throughout the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">Default Currency</Label>
              <CurrencySelect
                value={formData.defaultCurrency}
                onValueChange={(value) => handleChange('defaultCurrency', value)}
              />
              <p className="text-xs text-muted-foreground">
                The default currency used for new entries
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayDecimals">Display Decimals</Label>
              <Select
                value={String(formData.displayDecimals)}
                onValueChange={(value) => handleChange('displayDecimals', parseInt(value))}
              >
                <SelectTrigger id="displayDecimals" data-testid="display-decimals-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} decimal{n !== 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Number of decimal places to display
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roundingMode">Rounding Mode</Label>
              <Select
                value={formData.roundingMode}
                onValueChange={(value) => handleChange('roundingMode', value as RoundingMode)}
              >
                <SelectTrigger id="roundingMode" data-testid="rounding-mode-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROUNDING_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROUNDING_MODES.find((m) => m.value === formData.roundingMode)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbolPosition">Symbol Position</Label>
              <Select
                value={formData.symbolPosition}
                onValueChange={(value) => handleChange('symbolPosition', value as 'before' | 'after')}
              >
                <SelectTrigger id="symbolPosition" data-testid="symbol-position-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Before amount (e.g., $100)</SelectItem>
                  <SelectItem value="after">After amount (e.g., 100$)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Position of the currency symbol
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showCurrencySymbol"
              checked={formData.showCurrencySymbol}
              onChange={(e) => handleChange('showCurrencySymbol', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
              data-testid="show-currency-symbol-checkbox"
            />
            <Label htmlFor="showCurrencySymbol" className="text-sm font-normal">
              Show currency symbol in displays
            </Label>
          </div>

          <Button type="submit" disabled={isLoading} data-testid="save-currency-settings">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Currency Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
