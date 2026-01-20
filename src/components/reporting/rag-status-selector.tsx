'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RAGStatus } from '@/types/delivery-reporting';

interface RAGStatusSelectorProps {
  value: RAGStatus | null;
  onChange: (status: RAGStatus) => void;
  disabled?: boolean;
}

const RAG_OPTIONS: Array<{
  value: RAGStatus;
  label: string;
  bgColor: string;
  hoverColor: string;
  activeColor: string;
}> = [
  {
    value: 'green',
    label: 'Green',
    bgColor: 'bg-green-500',
    hoverColor: 'hover:bg-green-600',
    activeColor: 'bg-green-600',
  },
  {
    value: 'amber',
    label: 'Amber',
    bgColor: 'bg-amber-500',
    hoverColor: 'hover:bg-amber-600',
    activeColor: 'bg-amber-600',
  },
  {
    value: 'red',
    label: 'Red',
    bgColor: 'bg-red-500',
    hoverColor: 'hover:bg-red-600',
    activeColor: 'bg-red-600',
  },
];

export function RAGStatusSelector({
  value,
  onChange,
  disabled = false,
}: RAGStatusSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Overall Status <span className="text-red-500">*</span>
      </label>
      <div className="flex gap-2">
        {RAG_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md font-medium text-white transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isSelected
                  ? [option.activeColor, 'ring-2 ring-offset-2 ring-offset-background']
                  : [option.bgColor, option.hoverColor],
                isSelected && option.value === 'green' && 'ring-green-500',
                isSelected && option.value === 'amber' && 'ring-amber-500',
                isSelected && option.value === 'red' && 'ring-red-500',
                disabled && 'opacity-50 cursor-not-allowed',
                !isSelected && !disabled && 'opacity-80'
              )}
            >
              {isSelected && <Check className="h-4 w-4" />}
              {option.label}
            </button>
          );
        })}
      </div>
      {!value && (
        <p className="text-xs text-muted-foreground">
          Select the overall RAG status for this week
        </p>
      )}
    </div>
  );
}
