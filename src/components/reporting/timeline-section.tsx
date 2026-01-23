'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Check,
  Clock,
  Calendar,
  HelpCircle,
  X,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TimelineMilestone, TimelineStatus } from '@/types/delivery-reporting';
import { PLATFORM_OPTIONS } from '@/types/delivery-reporting';
import { TimelineDatePicker } from './timeline-date-picker';

interface TimelineSectionProps {
  items: TimelineMilestone[];
  onChange: (items: TimelineMilestone[]) => void;
  vendorId: string | null;
  disabled?: boolean;
}

const STATUS_OPTIONS: Array<{
  value: TimelineStatus;
  label: string;
  icon: typeof Check;
  bgColor: string;
  textColor: string;
}> = [
  {
    value: 'completed',
    label: 'Completed',
    icon: Check,
    bgColor: 'bg-green-500',
    textColor: 'text-white',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    icon: Clock,
    bgColor: 'bg-amber-500',
    textColor: 'text-white',
  },
  {
    value: 'upcoming',
    label: 'Upcoming',
    icon: Calendar,
    bgColor: 'bg-blue-500',
    textColor: 'text-white',
  },
  {
    value: 'tbc',
    label: 'TBC',
    icon: HelpCircle,
    bgColor: 'bg-gray-400',
    textColor: 'text-white',
  },
];

export function TimelineSection({
  items,
  onChange,
  vendorId,
  disabled = false,
}: TimelineSectionProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [newFeature, setNewFeature] = useState<{ [key: number]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Debounced save for item updates
  const debouncedSave = useCallback(
    async (item: TimelineMilestone, index: number) => {
      if (!vendorId || !item.id) return;

      // Clear existing timeout for this item
      if (saveTimeoutRef.current[item.id]) {
        clearTimeout(saveTimeoutRef.current[item.id]);
      }

      saveTimeoutRef.current[item.id] = setTimeout(async () => {
        try {
          await fetch(`/api/reporting/vendors/${vendorId}/timeline/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
        } catch (error) {
          console.error('Error saving timeline item:', error);
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

  const handleAdd = useCallback(async () => {
    if (!vendorId) return;

    setIsSaving(true);
    const newItem: TimelineMilestone = {
      date: '',
      title: 'New Milestone',
      status: 'upcoming',
      platforms: [],
      features: [],
      sortOrder: items.length,
    };

    try {
      const response = await fetch(`/api/reporting/vendors/${vendorId}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      const result = await response.json();
      if (result.success) {
        onChange([...items, result.data]);
      }
    } catch (error) {
      console.error('Error creating timeline item:', error);
    } finally {
      setIsSaving(false);
    }
  }, [items, onChange, vendorId]);

  const handleUpdate = useCallback(
    (index: number, updates: Partial<TimelineMilestone>) => {
      const updatedItem = { ...items[index], ...updates };
      const updated = items.map((item, i) =>
        i === index ? updatedItem : item
      );
      onChange(updated);
      debouncedSave(updatedItem, index);
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
          await fetch(`/api/reporting/vendors/${vendorId}/timeline/${item.id}`, {
            method: 'DELETE',
          });
        } catch (error) {
          console.error('Error deleting timeline item:', error);
        }
      }
    },
    [items, onChange, vendorId]
  );

  const togglePlatform = useCallback(
    (index: number, platform: string) => {
      const item = items[index];
      const platforms = item.platforms.includes(platform)
        ? item.platforms.filter((p) => p !== platform)
        : [...item.platforms, platform];
      handleUpdate(index, { platforms });
    },
    [items, handleUpdate]
  );

  const addFeature = useCallback(
    (index: number) => {
      const feature = newFeature[index]?.trim();
      if (!feature) return;

      const item = items[index];
      handleUpdate(index, { features: [...item.features, feature] });
      setNewFeature((prev) => ({ ...prev, [index]: '' }));
    },
    [items, newFeature, handleUpdate]
  );

  const removeFeature = useCallback(
    (index: number, featureIndex: number) => {
      const item = items[index];
      const features = item.features.filter((_, i) => i !== featureIndex);
      handleUpdate(index, { features });
    },
    [items, handleUpdate]
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
          fetch(`/api/reporting/vendors/${vendorId}/timeline/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sortOrder: item.sortOrder }),
          }).catch((error) => console.error('Error saving sort order:', error));
        }
      });
    }
  }, [vendorId, items]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>
            Delivery Timeline
            {items.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({items.length} milestone{items.length !== 1 ? 's' : ''})
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
            Add Milestone
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No milestones defined.</p>
            <p className="text-sm mt-1">
              Click &quot;Add Milestone&quot; to track delivery timeline events.
            </p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id || `new-${index}`}
              draggable={!disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'group flex gap-3 p-4 rounded-lg border bg-card transition-all duration-200',
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
                {/* Date and Title Row */}
                <div className="flex gap-3">
                  <TimelineDatePicker
                    value={item.date}
                    onChange={(date) => handleUpdate(index, { date })}
                    disabled={disabled}
                  />
                  <Input
                    value={item.title}
                    onChange={(e) => handleUpdate(index, { title: e.target.value })}
                    placeholder="Milestone title..."
                    disabled={disabled}
                    className="flex-1"
                  />
                </div>

                {/* Status Buttons */}
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const isSelected = item.status === option.value;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleUpdate(index, { status: option.value })}
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

                {/* Platforms */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Platforms</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORM_OPTIONS.map((platform) => {
                      const isSelected = item.platforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => togglePlatform(index, platform)}
                          disabled={disabled}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                            disabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {platform}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Features</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {item.features.map((feature, featureIndex) => (
                      <Badge
                        key={featureIndex}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {feature}
                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => removeFeature(index, featureIndex)}
                            className="hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newFeature[index] || ''}
                      onChange={(e) =>
                        setNewFeature((prev) => ({
                          ...prev,
                          [index]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addFeature(index);
                        }
                      }}
                      placeholder="Add feature..."
                      disabled={disabled}
                      className="text-sm h-8"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addFeature(index)}
                      disabled={disabled || !newFeature[index]?.trim()}
                      className="h-8"
                    >
                      Add
                    </Button>
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
          ))
        )}
      </CardContent>
    </Card>
  );
}
