'use client';

import { useCallback, useState } from 'react';
import { Plus, Trash2, GripVertical, Check, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Achievement, AchievementStatus } from '@/types/delivery-reporting';

interface AchievementsSectionProps {
  achievements: Achievement[];
  onChange: (achievements: Achievement[]) => void;
  onAchievementStatusChange?: (achievement: Achievement) => void;
  disabled?: boolean;
}

const STATUS_OPTIONS: Array<{
  value: AchievementStatus;
  label: string;
  icon: typeof Check;
  bgColor: string;
  hoverColor: string;
}> = [
  {
    value: 'done',
    label: 'Done',
    icon: Check,
    bgColor: 'bg-green-500',
    hoverColor: 'hover:bg-green-600',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    icon: Clock,
    bgColor: 'bg-amber-500',
    hoverColor: 'hover:bg-amber-600',
  },
];

export function AchievementsSection({
  achievements,
  onChange,
  onAchievementStatusChange,
  disabled = false,
}: AchievementsSectionProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const fromFocusCount = achievements.filter((a) => a.isFromFocus).length;

  const handleAdd = useCallback(() => {
    const newAchievement: Achievement = {
      description: '',
      status: null,
      isFromFocus: false,
      sortOrder: achievements.length,
    };
    onChange([...achievements, newAchievement]);
  }, [achievements, onChange]);

  const handleUpdate = useCallback(
    (index: number, updates: Partial<Achievement>) => {
      const updated = achievements.map((a, i) =>
        i === index ? { ...a, ...updates } : a
      );
      onChange(updated);

      // Notify parent of status changes for bidirectional sync
      if (updates.status !== undefined && onAchievementStatusChange) {
        onAchievementStatusChange({ ...achievements[index], ...updates });
      }
    },
    [achievements, onChange, onAchievementStatusChange]
  );

  const handleDelete = useCallback(
    (index: number) => {
      const updated = achievements
        .filter((_, i) => i !== index)
        .map((a, i) => ({ ...a, sortOrder: i }));
      onChange(updated);
    },
    [achievements, onChange]
  );

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === targetIndex) return;

      const updated = [...achievements];
      const [dragged] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, dragged);

      // Update sort orders
      const reordered = updated.map((a, i) => ({ ...a, sortOrder: i }));
      onChange(reordered);
      setDraggedIndex(targetIndex);
    },
    [achievements, draggedIndex, onChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>
            Achievements This Week
            {fromFocusCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({fromFocusCount} from last week&apos;s focus)
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
            Add Achievement
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {achievements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No achievements recorded yet.</p>
            <p className="text-sm mt-1">
              Click &quot;Add Achievement&quot; to record what was accomplished this week.
            </p>
          </div>
        ) : (
          achievements.map((achievement, index) => (
            <div
              key={achievement.id || `new-${index}`}
              draggable={!disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                'group flex gap-3 p-3 rounded-lg border bg-card transition-all duration-200',
                achievement.isFromFocus && 'border-l-4 border-l-blue-500',
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
                  {achievement.isFromFocus && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      From Focus
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <Textarea
                  value={achievement.description}
                  onChange={(e) =>
                    handleUpdate(index, { description: e.target.value })
                  }
                  placeholder="Describe what was achieved..."
                  disabled={disabled}
                  className="min-h-[60px] resize-none"
                />

                {/* Status Buttons */}
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const isSelected = achievement.status === option.value;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          handleUpdate(index, {
                            status: isSelected ? null : option.value,
                          })
                        }
                        disabled={disabled}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                          isSelected
                            ? [option.bgColor, 'text-white']
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
