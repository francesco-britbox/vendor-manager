'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getCurrenciesByRegion, formatCurrencyLabel } from '@/lib/currency';

interface CurrencySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeCurrency?: string;
  className?: string;
}

/**
 * Currency selector dropdown with currencies grouped by region
 */
export function CurrencySelect({
  value,
  onValueChange,
  placeholder = 'Select currency',
  disabled = false,
  excludeCurrency,
  className,
}: CurrencySelectProps) {
  const currenciesByRegion = React.useMemo(() => getCurrenciesByRegion(), []);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(currenciesByRegion).map(([region, currencies]) => (
          <SelectGroup key={region}>
            <SelectLabel>{region}</SelectLabel>
            {currencies
              .filter(c => c.code !== excludeCurrency)
              .map(currency => (
                <SelectItem key={currency.code} value={currency.code}>
                  {formatCurrencyLabel(currency.code)} - {currency.name}
                </SelectItem>
              ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
