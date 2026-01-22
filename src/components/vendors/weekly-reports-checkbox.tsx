'use client';

import * as React from 'react';
import { Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Save status type for the checkbox
 */
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface WeeklyReportsCheckboxProps {
  vendorId: string;
  initialValue: boolean;
  disabled?: boolean;
  onUpdate?: (newValue: boolean) => void;
}

/**
 * A real-time checkbox component for toggling vendor inclusion in weekly reports.
 *
 * Features:
 * - Immediate visual feedback on state change
 * - Debounced API calls to prevent race conditions
 * - Error handling with retry functionality
 * - Optimistic updates with rollback on failure
 * - Accessibility support (keyboard navigation, screen reader labels)
 * - Disabled state while update is in progress
 */
export function WeeklyReportsCheckbox({
  vendorId,
  initialValue,
  disabled = false,
  onUpdate,
}: WeeklyReportsCheckboxProps) {
  const [isChecked, setIsChecked] = React.useState(initialValue ?? false);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle');
  const [error, setError] = React.useState<string | null>(null);

  // Track the pending value for debouncing
  const pendingValueRef = React.useRef<boolean | null>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Store previous value for rollback on error
  const previousValueRef = React.useRef<boolean>(initialValue);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Sync with initial value changes (e.g., if parent re-fetches data)
  React.useEffect(() => {
    setIsChecked(initialValue);
    previousValueRef.current = initialValue;
  }, [initialValue]);

  /**
   * Perform the actual API call to update the vendor
   */
  const performUpdate = React.useCallback(async (newValue: boolean) => {
    // Abort any previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setSaveStatus('saving');
    setError(null);

    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeInWeeklyReports: newValue }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update vendor');
      }

      // Update was successful
      setSaveStatus('saved');
      previousValueRef.current = newValue;
      onUpdate?.(newValue);

      // Reset to idle after showing success indicator
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err) {
      // Don't handle aborted requests as errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      // Rollback to previous value on error
      setIsChecked(previousValueRef.current);
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    }
  }, [vendorId, onUpdate]);

  /**
   * Handle checkbox change with debouncing
   */
  const handleChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;

    // Optimistic update
    setIsChecked(newValue);
    pendingValueRef.current = newValue;
    setError(null);

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the API call (300ms)
    debounceTimerRef.current = setTimeout(() => {
      if (pendingValueRef.current !== null) {
        performUpdate(pendingValueRef.current);
        pendingValueRef.current = null;
      }
    }, 300);
  }, [performUpdate]);

  /**
   * Retry the last failed update
   */
  const handleRetry = React.useCallback(() => {
    performUpdate(isChecked);
  }, [performUpdate, isChecked]);

  const isUpdating = saveStatus === 'saving';
  const isDisabled = disabled || isUpdating;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div className="relative">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={handleChange}
              disabled={isDisabled}
              className={cn(
                'h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0',
                'transition-colors duration-200',
                isDisabled && 'cursor-not-allowed opacity-50'
              )}
              aria-label="Include in weekly reports"
              aria-describedby="weekly-reports-checkbox-description"
            />
          </div>
          <span
            className={cn(
              'text-sm font-medium',
              isDisabled ? 'text-muted-foreground' : 'text-foreground'
            )}
          >
            Include in weekly reports
          </span>
        </label>

        {/* Save status indicator */}
        <div className="flex items-center" aria-live="polite">
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs">Saving...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-1 text-green-600 animate-in fade-in duration-200">
              <Check className="h-3 w-3" />
              <span className="text-xs">Saved</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs">Failed</span>
            </div>
          )}
        </div>
      </div>

      {/* Error message with retry button */}
      {saveStatus === 'error' && error && (
        <div className="flex items-center gap-2 text-xs text-red-600 ml-6">
          <span>{error}</span>
          <button
            type="button"
            onClick={handleRetry}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded',
              'bg-red-100 hover:bg-red-200 text-red-700',
              'transition-colors duration-200 font-medium'
            )}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* Screen reader description */}
      <span id="weekly-reports-checkbox-description" className="sr-only">
        Toggle whether this vendor location should be included in weekly delivery reports
      </span>
    </div>
  );
}
