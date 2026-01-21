'use client';

import { useCallback, useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FocusItem } from '@/types/delivery-reporting';

interface FocusSectionProps {
  focusItems: FocusItem[];
  onChange: (items: FocusItem[]) => void;
  disabled?: boolean;
}

export function FocusSection({
  focusItems,
  onChange,
  disabled = false,
}: FocusSectionProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const carriedOverCount = focusItems.filter((f) => f.isCarriedOver).length;

  const handleAdd = useCallback(() => {
    const newItem: FocusItem = {
      clientId: crypto.randomUUID(), // Stable ID for React key
      description: '',
      isCarriedOver: false,
      sortOrder: focusItems.length,
    };
    onChange([...focusItems, newItem]);
  }, [focusItems, onChange]);

  const handleUpdate = useCallback(
    (index: number, updates: Partial<FocusItem>) => {
      const updated = focusItems.map((f, i) =>
        i === index ? { ...f, ...updates } : f
      );
      onChange(updated);
    },
    [focusItems, onChange]
  );

  const handleDelete = useCallback(
    (index: number) => {
      const updated = focusItems
        .filter((_, i) => i !== index)
        .map((f, i) => ({ ...f, sortOrder: i }));
      onChange(updated);
    },
    [focusItems, onChange]
  );

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === targetIndex) return;

      const updated = [...focusItems];
      const [dragged] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, dragged);

      // Update sort orders
      const reordered = updated.map((f, i) => ({ ...f, sortOrder: i }));
      onChange(reordered);
      setDraggedIndex(targetIndex);
    },
    [focusItems, draggedIndex, onChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>
            Focus Next Week
            {carriedOverCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({carriedOverCount} carried over from in-progress achievements)
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
            Add Focus Item
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {focusItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No focus items for next week.</p>
            <p className="text-sm mt-1">
              Items marked as &quot;In Progress&quot; in achievements will appear here
              automatically, or click &quot;Add Focus Item&quot; to add new ones.
            </p>
          </div>
        ) : (
          focusItems.map((item, index) => (
            <div
              key={item.clientId || item.id || `fallback-${index}`}
              draggable={!disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'group flex gap-3 p-3 rounded-lg border bg-card transition-all duration-200',
                item.isCarriedOver && 'border-l-4 border-l-amber-500',
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
              <div className="flex-1 space-y-2">
                {/* Badges */}
                <div className="flex gap-2">
                  {item.isCarriedOver ? (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      Carried Over
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                      New
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <Textarea
                  value={item.description}
                  onChange={(e) =>
                    handleUpdate(index, { description: e.target.value })
                  }
                  placeholder="Describe the focus item for next week..."
                  disabled={disabled}
                  className="min-h-[60px] resize-none"
                />
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
