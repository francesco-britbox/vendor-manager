'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  FileText,
  ExternalLink,
  BookOpen,
  Github,
  Link as LinkIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { VendorResourceItem, ResourceType } from '@/types/delivery-reporting';

interface ResourcesSectionProps {
  items: VendorResourceItem[];
  onChange: (items: VendorResourceItem[]) => void;
  vendorId: string | null;
  disabled?: boolean;
}

const TYPE_OPTIONS: Array<{
  value: ResourceType;
  label: string;
  icon: typeof FileText;
  bgColor: string;
  textColor: string;
}> = [
  {
    value: 'confluence',
    label: 'Confluence',
    icon: BookOpen,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  {
    value: 'jira',
    label: 'Jira',
    icon: FileText,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  {
    value: 'github',
    label: 'GitHub',
    icon: Github,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
  {
    value: 'docs',
    label: 'Docs',
    icon: LinkIcon,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
];

export function ResourcesSection({
  items,
  onChange,
  vendorId,
  disabled = false,
}: ResourcesSectionProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [urlErrors, setUrlErrors] = useState<{ [key: number]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Debounced save for item updates
  const debouncedSave = useCallback(
    async (item: VendorResourceItem) => {
      if (!vendorId || !item.id) return;

      if (saveTimeoutRef.current[item.id]) {
        clearTimeout(saveTimeoutRef.current[item.id]);
      }

      saveTimeoutRef.current[item.id] = setTimeout(async () => {
        try {
          await fetch(`/api/reporting/vendors/${vendorId}/resources/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
        } catch (error) {
          console.error('Error saving resource item:', error);
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
    const newItem: VendorResourceItem = {
      type: 'docs',
      name: '',
      description: '',
      url: '',
      sortOrder: items.length,
    };

    try {
      const response = await fetch(`/api/reporting/vendors/${vendorId}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      const result = await response.json();
      if (result.success) {
        onChange([...items, result.data]);
      }
    } catch (error) {
      console.error('Error creating resource item:', error);
    } finally {
      setIsSaving(false);
    }
  }, [items, onChange, vendorId]);

  const handleUpdate = useCallback(
    (index: number, updates: Partial<VendorResourceItem>) => {
      // Validate URL if provided
      if (updates.url !== undefined) {
        try {
          if (updates.url) {
            new URL(updates.url);
          }
          setUrlErrors((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
          });
        } catch {
          setUrlErrors((prev) => ({ ...prev, [index]: 'Invalid URL format' }));
        }
      }

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

      // Clear URL error
      setUrlErrors((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });

      if (vendorId && item.id) {
        try {
          await fetch(`/api/reporting/vendors/${vendorId}/resources/${item.id}`, {
            method: 'DELETE',
          });
        } catch (error) {
          console.error('Error deleting resource item:', error);
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
  }, []);

  const getTypeConfig = (type: ResourceType) =>
    TYPE_OPTIONS.find((t) => t.value === type) || TYPE_OPTIONS[3];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>
            Resources
            {items.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({items.length} link{items.length !== 1 ? 's' : ''})
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
            Add Resource
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No resources added.</p>
            <p className="text-sm mt-1">
              Click &quot;Add Resource&quot; to link to relevant documentation, Jira boards,
              or repositories.
            </p>
          </div>
        ) : (
          items.map((item, index) => {
            const typeConfig = getTypeConfig(item.type);
            const TypeIcon = typeConfig.icon;
            const hasUrlError = !!urlErrors[index];

            return (
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
                  {/* Type Selection */}
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

                  {/* Name */}
                  <Input
                    value={item.name}
                    onChange={(e) => handleUpdate(index, { name: e.target.value })}
                    placeholder="Resource name..."
                    disabled={disabled}
                  />

                  {/* URL */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        value={item.url}
                        onChange={(e) => handleUpdate(index, { url: e.target.value })}
                        placeholder="https://..."
                        disabled={disabled}
                        className={cn(hasUrlError && 'border-red-500')}
                      />
                      {hasUrlError && (
                        <p className="text-xs text-red-500 mt-1">{urlErrors[index]}</p>
                      )}
                    </div>
                    {item.url && !hasUrlError && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(item.url, '_blank')}
                        disabled={disabled}
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Description (optional) */}
                  <Textarea
                    value={item.description || ''}
                    onChange={(e) =>
                      handleUpdate(index, { description: e.target.value })
                    }
                    placeholder="Description (optional)..."
                    disabled={disabled}
                    className="min-h-[40px] resize-none"
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
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
