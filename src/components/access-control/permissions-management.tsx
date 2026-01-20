'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Lock,
  Unlock,
  FileText,
  LayoutGrid,
  Save,
  Loader2,
  Info,
  ChevronRight,
  Check,
} from 'lucide-react';
import type { ResourceWithPermissions } from '@/types';
import { cn } from '@/lib/utils';

interface PermissionsManagementProps {
  initialResources?: ResourceWithPermissions[];
  initialGroups?: Array<{ id: string; name: string; isSystem: boolean }>;
}

export function PermissionsManagement({
  initialResources = [],
  initialGroups = [],
}: PermissionsManagementProps) {
  const [resources, setResources] = React.useState<ResourceWithPermissions[]>(initialResources);
  const [groups, setGroups] = React.useState<Array<{ id: string; name: string; isSystem: boolean }>>(
    initialGroups
  );
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Track pending changes
  const [pendingChanges, setPendingChanges] = React.useState<
    Record<string, string[]>
  >({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);

  // Fetch resources and groups
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/access-control/permissions?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch permissions');
      }

      setResources(data.data.resources);
      setGroups(data.data.groups);
      setPendingChanges({});
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, typeFilter]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get current group IDs for a resource (considering pending changes)
  const getResourceGroupIds = (resource: ResourceWithPermissions): string[] => {
    if (pendingChanges[resource.id] !== undefined) {
      return pendingChanges[resource.id];
    }
    return resource.assignedGroups.map((g) => g.id);
  };

  // Toggle group for a resource
  const toggleGroup = (resourceId: string, groupId: string) => {
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) return;

    const currentGroupIds = getResourceGroupIds(resource);
    const newGroupIds = currentGroupIds.includes(groupId)
      ? currentGroupIds.filter((id) => id !== groupId)
      : [...currentGroupIds, groupId];

    setPendingChanges((prev) => ({
      ...prev,
      [resourceId]: newGroupIds,
    }));
    setHasUnsavedChanges(true);
  };

  // Check if a resource has been modified
  const isResourceModified = (resource: ResourceWithPermissions): boolean => {
    if (pendingChanges[resource.id] === undefined) return false;

    const originalGroupIds = resource.assignedGroups.map((g) => g.id).sort();
    const currentGroupIds = [...pendingChanges[resource.id]].sort();

    if (originalGroupIds.length !== currentGroupIds.length) return true;
    return !originalGroupIds.every((id, i) => id === currentGroupIds[i]);
  };

  // Save all changes
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Only send actual changes
      const assignments = Object.entries(pendingChanges)
        .filter(([resourceId]) => {
          const resource = resources.find((r) => r.id === resourceId);
          return resource && isResourceModified(resource);
        })
        .map(([resourceId, groupIds]) => ({
          resourceId,
          groupIds,
        }));

      if (assignments.length === 0) {
        setSuccess('No changes to save');
        setHasUnsavedChanges(false);
        return;
      }

      const response = await fetch('/api/access-control/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save permissions');
      }

      setSuccess('Permissions saved successfully');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  // Discard changes
  const handleDiscard = () => {
    setPendingChanges({});
    setHasUnsavedChanges(false);
  };

  // Clear messages after delay
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Group resources by type
  const pageResources = resources.filter((r) => r.type === 'page');
  const componentResources = resources.filter((r) => r.type === 'component');

  const renderResourceRow = (resource: ResourceWithPermissions) => {
    const groupIds = getResourceGroupIds(resource);
    const isRestricted = groupIds.length > 0;
    const isModified = isResourceModified(resource);
    const isSubPage = resource.parentKey && resource.type === 'page';

    return (
      <div
        key={resource.id}
        className={cn(
          'flex items-start gap-4 p-4 border-b last:border-b-0',
          isModified && 'bg-amber-50 dark:bg-amber-950/20',
          isSubPage && 'pl-8'
        )}
      >
        {/* Resource Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isSubPage && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {resource.type === 'page' ? (
              <FileText className="h-4 w-4 text-blue-500" />
            ) : (
              <LayoutGrid className="h-4 w-4 text-purple-500" />
            )}
            <span className="font-medium">{resource.name}</span>
            {isModified && (
              <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
                Modified
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            {resource.description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm text-muted-foreground truncate max-w-md cursor-help">
                      {resource.description}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{resource.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {resource.path && (
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {resource.path}
              </code>
            )}
          </div>
        </div>

        {/* Access Status */}
        <div className="flex items-center gap-2 min-w-[120px]">
          {isRestricted ? (
            <Badge variant="secondary" className="text-amber-600">
              <Lock className="h-3 w-3 mr-1" />
              Restricted
            </Badge>
          ) : (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Unlock className="h-3 w-3 mr-1" />
              Open
            </Badge>
          )}
        </div>

        {/* Group Selection */}
        <div className="flex flex-wrap gap-1 min-w-[300px] justify-end">
          {groups.map((group) => {
            const isSelected = groupIds.includes(group.id);
            return (
              <Button
                key={group.id}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleGroup(resource.id, group.id)}
                className={cn(
                  'text-xs h-7',
                  isSelected && 'bg-primary text-primary-foreground'
                )}
              >
                {isSelected && <Check className="h-3 w-3 mr-1" />}
                {group.name}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Permission Assignment
            </CardTitle>
            <CardDescription>
              Control which groups can access pages and components
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {hasUnsavedChanges && (
              <Button variant="outline" onClick={handleDiscard} disabled={isSaving}>
                Discard
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        {error && (
          <div className="rounded-md bg-destructive/15 p-4 text-destructive text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-500/15 p-4 text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium">How permissions work:</p>
            <ul className="mt-1 space-y-1 text-blue-700 dark:text-blue-300">
              <li>
                <Unlock className="h-3 w-3 inline mr-1" />
                <strong>Open</strong> resources (no groups selected) are accessible to all
                authenticated users
              </li>
              <li>
                <Lock className="h-3 w-3 inline mr-1" />
                <strong>Restricted</strong> resources (groups selected) are only accessible
                to users in those groups + super users
              </li>
            </ul>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages and components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="page">Pages Only</SelectItem>
              <SelectItem value="component">Components Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Resources List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No resources found
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pages Section */}
            {(typeFilter === 'all' || typeFilter === 'page') &&
              pageResources.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Pages ({pageResources.length})
                  </h3>
                  <div className="border rounded-lg bg-card">
                    {pageResources.map(renderResourceRow)}
                  </div>
                </div>
              )}

            {/* Components Section */}
            {(typeFilter === 'all' || typeFilter === 'component') &&
              componentResources.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Components ({componentResources.length})
                  </h3>
                  <div className="border rounded-lg bg-card">
                    {componentResources.map(renderResourceRow)}
                  </div>
                </div>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
