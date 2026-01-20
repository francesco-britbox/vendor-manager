'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, AlertCircle, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SaveStatus } from '@/types/delivery-reporting';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  onRetry?: () => void;
}

export function SaveStatusIndicator({ status, onRetry }: SaveStatusIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  // Show "saved" for 2 seconds after save completes
  useEffect(() => {
    if (status === 'saved') {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (status === 'idle' && !showSaved) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Cloud className="h-4 w-4" />
        <span>Draft</span>
      </div>
    );
  }

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm animate-pulse">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (status === 'saved' || showSaved) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <Check className="h-4 w-4" />
        <span>All changes saved</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>Save failed - changes stored locally</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              'bg-red-100 hover:bg-red-200 text-red-700',
              'transition-colors duration-200'
            )}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return null;
}
