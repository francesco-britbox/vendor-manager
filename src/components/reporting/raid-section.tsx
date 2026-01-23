'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  AlertTriangle,
  AlertCircle,
  Link2,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RaidItem, RaidType, ImpactLevel, RAGStatus } from '@/types/delivery-reporting';

interface RAIDSectionProps {
  items: RaidItem[];
  onChange: (items: RaidItem[]) => void;
  vendorId: string | null;
  disabled?: boolean;
}

const TYPE_OPTIONS: Array<{
  value: RaidType;
  label: string;
  icon: typeof AlertTriangle;
  bgColor: string;
  textColor: string;
}> = [
  {
    value: 'risk',
    label: 'Risk',
    icon: AlertTriangle,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  {
    value: 'issue',
    label: 'Issue',
    icon: AlertCircle,
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
  },
  {
    value: 'dependency',
    label: 'Dependency',
    icon: Link2,
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-700',
  },
];

const IMPACT_OPTIONS: Array<{
  value: ImpactLevel;
  label: string;
  bgColor: string;
  textColor: string;
}> = [
  { value: 'high', label: 'High', bgColor: 'bg-red-500', textColor: 'text-white' },
  { value: 'medium', label: 'Medium', bgColor: 'bg-amber-500', textColor: 'text-white' },
  { value: 'low', label: 'Low', bgColor: 'bg-green-500', textColor: 'text-white' },
];

const RAG_OPTIONS: Array<{
  value: RAGStatus;
  label: string;
  bgColor: string;
}> = [
  { value: 'green', label: 'Green', bgColor: 'bg-green-500' },
  { value: 'amber', label: 'Amber', bgColor: 'bg-amber-500' },
  { value: 'red', label: 'Red', bgColor: 'bg-red-500' },
];

export function RAIDSection({
  items,
  onChange,
  vendorId,
  disabled = false,
}: RAIDSectionProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Debounced save for item updates
  const debouncedSave = useCallback(
    async (item: RaidItem) => {
      if (!vendorId || !item.id) return;

      if (saveTimeoutRef.current[item.id]) {
        clearTimeout(saveTimeoutRef.current[item.id]);
      }

      saveTimeoutRef.current[item.id] = setTimeout(async () => {
        try {
          await fetch(`/api/reporting/vendors/${vendorId}/raid/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
        } catch (error) {
          console.error('Error saving RAID item:', error);
        }
      }, 500);
    },
    [vendorId]
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeoutRef.current).forEach(clearTimeout);
    };
  }, []);

  // Count items by type
  const counts = items.reduce(
    (acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    },
    {} as Record<RaidType, number>
  );

  const handleAdd = useCallback(async () => {
    if (!vendorId) return;

    setIsSaving(true);
    const newItem: RaidItem = {
      type: 'risk',
      area: '',
      description: '',
      impact: 'medium',
      owner: '',
      ragStatus: 'amber',
      sortOrder: items.length,
    };

    try {
      const response = await fetch(`/api/reporting/vendors/${vendorId}/raid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      const result = await response.json();
      if (result.success) {
        onChange([...items, result.data]);
      }
    } catch (error) {
      console.error('Error creating RAID item:', error);
    } finally {
      setIsSaving(false);
    }
  }, [items, onChange, vendorId]);

  const handleUpdate = useCallback(
    (index: number, updates: Partial<RaidItem>) => {
      const updatedItem = { ...items[index], ...updates };
      const updated = items.map((item, i) =>
        i === index ? updatedItem : item
      );
      onChange(updated);
      debouncedSave(updatedItem);
    },
    [items, onChange, debouncedSave]
  );

  const handleDelete = useCallback(
    async (index: number) => {
      const item = items[index];
      const updated = items
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, sortOrder: i }));
      onChange(updated);

      if (vendorId && item.id) {
        try {
          await fetch(`/api/reporting/vendors/${vendorId}/raid/${item.id}`, {
            method: 'DELETE',
          });
        } catch (error) {
          console.error('Error deleting RAID item:', error);
        }
      }
    },
    [items, onChange, vendorId]
  );

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === targetIndex) return;

      const updated = [...items];
      const [dragged] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, dragged);

      const reordered = updated.map((item, i) => ({ ...item, sortOrder: i }));
      onChange(reordered);
      setDraggedIndex(targetIndex);
    },
    [items, draggedIndex, onChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    // Persist the new sort order for all items
    if (vendorId) {
      items.forEach((item) => {
        if (item.id) {
          fetch(`/api/reporting/vendors/${vendorId}/raid/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sortOrder: item.sortOrder }),
          }).catch((error) => console.error('Error saving sort order:', error));
        }
      });
    }
  }, [vendorId, items]);

  const getTypeConfig = (type: RaidType) =>
    TYPE_OPTIONS.find((t) => t.value === type) || TYPE_OPTIONS[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>
            RAID Log
            {items.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({counts.risk || 0} risks, {counts.issue || 0} issues,{' '}
                {counts.dependency || 0} dependencies)
              </span>
            )}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add RAID Item
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No RAID items recorded.</p>
            <p className="text-sm mt-1">
              Click &quot;Add RAID Item&quot; to track risks, issues, and dependencies.
            </p>
          </div>
        ) : (
          items.map((item, index) => {
            const typeConfig = getTypeConfig(item.type);
            const TypeIcon = typeConfig.icon;

            return (
              <div
                key={item.id || `new-${index}`}
                draggable={!disabled}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'group flex gap-3 p-4 rounded-lg border bg-card transition-all duration-200',
                  'border-l-4',
                  item.type === 'risk' && 'border-l-amber-500',
                  item.type === 'issue' && 'border-l-red-500',
                  item.type === 'dependency' && 'border-l-cyan-500',
                  draggedIndex === index && 'opacity-50',
                  !disabled && 'hover:shadow-sm'
                )}
              >
                {/* Drag Handle */}
                <div
                  className={cn(
                    'flex items-center text-muted-foreground cursor-grab',
                    disabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <GripVertical className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  {/* Type Badge and Selection */}
                  <div className="flex flex-wrap gap-2">
                    {TYPE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = item.type === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleUpdate(index, { type: option.value })}
                          disabled={disabled}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                            isSelected
                              ? [option.bgColor, option.textColor]
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                            disabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Area and Owner */}
                  <div className="flex gap-3">
                    <Input
                      value={item.area}
                      onChange={(e) => handleUpdate(index, { area: e.target.value })}
                      placeholder="Area (e.g., Integration, Security)"
                      disabled={disabled}
                      className="flex-1"
                    />
                    <Input
                      value={item.owner || ''}
                      onChange={(e) => handleUpdate(index, { owner: e.target.value })}
                      placeholder="Owner (optional)"
                      disabled={disabled}
                      className="w-40"
                    />
                  </div>

                  {/* Description */}
                  <Textarea
                    value={item.description}
                    onChange={(e) =>
                      handleUpdate(index, { description: e.target.value })
                    }
                    placeholder="Describe the risk, issue, or dependency..."
                    disabled={disabled}
                    className="min-h-[60px] resize-none"
                  />

                  {/* Impact and RAG Status */}
                  <div className="flex flex-wrap gap-4">
                    {/* Impact */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Impact</label>
                      <div className="flex gap-1.5">
                        {IMPACT_OPTIONS.map((option) => {
                          const isSelected = item.impact === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                handleUpdate(index, { impact: option.value })
                              }
                              disabled={disabled}
                              className={cn(
                                'px-2.5 py-1 rounded text-xs font-medium transition-all duration-200',
                                isSelected
                                  ? [option.bgColor, option.textColor]
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                                disabled && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* RAG Status */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Status</label>
                      <div className="flex gap-1.5">
                        {RAG_OPTIONS.map((option) => {
                          const isSelected = item.ragStatus === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                handleUpdate(index, { ragStatus: option.value })
                              }
                              disabled={disabled}
                              className={cn(
                                'flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200',
                                isSelected
                                  ? [option.bgColor, 'text-white ring-2 ring-offset-2']
                                  : [option.bgColor, 'opacity-40 hover:opacity-70'],
                                disabled && 'cursor-not-allowed'
                              )}
                            >
                              {isSelected && <Check className="h-4 w-4" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  disabled={disabled}
                  className={cn(
                    'opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-red-600 transition-all duration-200',
                    disabled && 'hidden'
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
