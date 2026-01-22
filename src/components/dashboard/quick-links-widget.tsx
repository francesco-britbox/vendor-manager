'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Link as LinkIcon,
  Search,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Settings2,
  AlertCircle,
  Pin,
  PinOff,
  Globe,
  Info,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type {
  QuickLinkWithCategory,
  QuickLinkSortOption,
  QuickLinkPageSize,
  ApiResponse,
} from '@/types';
import Link from 'next/link';

interface QuickLinksWidgetProps {
  className?: string;
}

const PAGE_SIZE_OPTIONS: QuickLinkPageSize[] = [20, 50, 70, 100];
const SORT_OPTIONS: { value: QuickLinkSortOption; label: string }[] = [
  { value: 'category', label: 'By Category' },
  { value: 'alphabetical', label: 'A-Z' },
  { value: 'custom', label: 'Custom Order' },
];

// LocalStorage key for pinned links
const PINNED_LINKS_STORAGE_KEY = 'quick-links-pinned';
const MAX_PINNED_LINKS = 50; // Reasonable limit to prevent localStorage quota issues

// ============================================================================
// LOCALSTORAGE UTILITIES FOR PINNING
// ============================================================================

/**
 * Get pinned link IDs from localStorage
 */
function getPinnedLinkIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(PINNED_LINKS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Save pinned link IDs to localStorage
 */
function savePinnedLinkIds(ids: string[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Limit the number of pinned links to prevent quota issues
    const limitedIds = ids.slice(0, MAX_PINNED_LINKS);
    localStorage.setItem(PINNED_LINKS_STORAGE_KEY, JSON.stringify(limitedIds));
    return true;
  } catch (e) {
    // Handle quota exceeded error
    console.error('Failed to save pinned links to localStorage:', e);
    return false;
  }
}

/**
 * Extract domain from URL for favicon fetching
 */
function extractDomain(url: string): string | null {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Get Google favicon URL for a domain
 */
function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

// Returns a default link icon (can be extended to support custom icons in the future)
function getLinkIcon(): React.ReactNode {
  return <LinkIcon className="h-4 w-4" />;
}

// Favicon image component with fallback - defined outside to avoid re-creation
function FaviconImage({ src, fallback }: { src: string; fallback: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt="Site icon"
      className="h-4 w-4 rounded-sm"
      onError={() => setHasError(true)}
    />
  );
}

export function QuickLinksWidget({ className }: QuickLinksWidgetProps) {
  // State
  const [links, setLinks] = useState<QuickLinkWithCategory[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<QuickLinkWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<QuickLinkSortOption>('category');
  const [pageSize, setPageSize] = useState<QuickLinkPageSize>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('quick-links');

  // Pinning state
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [pinError, setPinError] = useState<string | null>(null);

  // Load pinned IDs from localStorage on mount
  useEffect(() => {
    const stored = getPinnedLinkIds();
    setPinnedIds(new Set(stored));
  }, []);

  // Toggle pin status for a link
  const togglePin = useCallback((linkId: string) => {
    setPinError(null);
    setPinnedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(linkId)) {
        newSet.delete(linkId);
      } else {
        if (newSet.size >= MAX_PINNED_LINKS) {
          setPinError(`Maximum of ${MAX_PINNED_LINKS} pinned links reached`);
          return prev;
        }
        newSet.add(linkId);
      }
      // Save to localStorage
      const success = savePinnedLinkIds(Array.from(newSet));
      if (!success) {
        setPinError('Failed to save pin preference. Storage may be full.');
        return prev;
      }
      return newSet;
    });
  }, []);

  // Check if a link is pinned
  const isLinkPinned = useCallback((linkId: string) => {
    return pinnedIds.has(linkId);
  }, [pinnedIds]);

  // Fetch links
  const fetchLinks = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`/api/quick-links?sortBy=${sortBy}`);
      const data: ApiResponse<{ links: QuickLinkWithCategory[]; total: number }> =
        await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch links');
      }

      setLinks(data.data?.links || []);
    } catch (err) {
      console.error('Error fetching quick links:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quick links');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [sortBy]);

  // Initial fetch
  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Filter and search links, with pinned items at top
  useEffect(() => {
    let result = [...links];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (link) =>
          link.title.toLowerCase().includes(query) ||
          link.description?.toLowerCase().includes(query) ||
          link.url.toLowerCase().includes(query) ||
          link.category.displayName.toLowerCase().includes(query)
      );
    }

    // Sort links
    result = sortLinks(result, sortBy);

    // Move pinned links to top while preserving their relative order
    const pinned = result.filter(link => pinnedIds.has(link.id));
    const unpinned = result.filter(link => !pinnedIds.has(link.id));
    result = [...pinned, ...unpinned];

    setFilteredLinks(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [links, searchQuery, sortBy, pinnedIds]);

  // Sort links helper
  const sortLinks = (
    linksToSort: QuickLinkWithCategory[],
    sort: QuickLinkSortOption
  ): QuickLinkWithCategory[] => {
    const sorted = [...linksToSort];

    switch (sort) {
      case 'alphabetical':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'custom':
        sorted.sort((a, b) => a.sortOrder - b.sortOrder);
        break;
      case 'category':
      default:
        sorted.sort((a, b) => {
          // First sort by category
          const catCompare =
            a.category.sortOrder - b.category.sortOrder ||
            a.category.displayName.localeCompare(b.category.displayName);
          if (catCompare !== 0) return catCompare;
          // Then by sort order within category
          return a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);
        });
        break;
    }

    return sorted;
  };

  // Pagination
  const totalPages = Math.ceil(filteredLinks.length / pageSize);
  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLinks.slice(start, start + pageSize);
  }, [filteredLinks, currentPage, pageSize]);

  // Group links by category for display
  const groupedLinks = useMemo(() => {
    if (sortBy !== 'category') {
      return null; // Don't group if not sorting by category
    }

    const groups = new Map<string, QuickLinkWithCategory[]>();
    for (const link of paginatedLinks) {
      const categoryName = link.category.displayName;
      const existing = groups.get(categoryName) || [];
      groups.set(categoryName, [...existing, link]);
    }
    return groups;
  }, [paginatedLinks, sortBy]);

  // Handle refresh
  const handleRefresh = () => {
    fetchLinks(false);
  };

  // Handle page change
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Render link card with favicon and pin button
  const renderLinkCard = (link: QuickLinkWithCategory) => {
    const isPinned = isLinkPinned(link.id);
    const domain = extractDomain(link.url);
    const faviconUrl = domain ? getFaviconUrl(domain) : null;

    return (
      <div
        key={link.id}
        className={cn(
          'group relative flex items-start gap-3 p-3 rounded-lg border',
          'bg-card hover:bg-accent/50 hover:border-primary/50',
          'transition-all duration-200',
          isPinned && 'border-primary/30 bg-primary/5'
        )}
      >
        {/* Pin indicator */}
        {isPinned && (
          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
            <Pin className="h-2.5 w-2.5" />
          </div>
        )}

        {/* Pin/Unpin button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity',
            isPinned && 'opacity-100'
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePin(link.id);
          }}
          title={isPinned ? 'Unpin link' : 'Pin link'}
        >
          {isPinned ? (
            <PinOff className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Pin className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>

        {/* Link content */}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 flex-1 min-w-0"
        >
          <div className="flex-shrink-0 p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors overflow-hidden">
            {faviconUrl ? (
              <FaviconImage src={faviconUrl} fallback={getLinkIcon()} />
            ) : (
              getLinkIcon()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                {link.title}
              </h4>
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {link.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {link.description}
              </p>
            )}
            {sortBy !== 'category' && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {link.category.displayName}
              </Badge>
            )}
          </div>
        </a>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn('col-span-full', className)} data-testid="quick-links-widget">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('col-span-full', className)} data-testid="quick-links-widget">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (links.length === 0) {
    return (
      <Card className={cn('col-span-full', className)} data-testid="quick-links-widget">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Quick Links
          </CardTitle>
          <CardDescription>
            Your frequently used resources and links
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium text-sm">No quick links yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Quick links will appear here once added
            </p>
            <Link href="/resources/quick-links">
              <Button variant="outline" size="sm" className="mt-4">
                <Settings2 className="h-4 w-4 mr-2" />
                Manage Links
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('col-span-full', className)} data-testid="quick-links-widget">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              Quick Links
            </CardTitle>
            <CardDescription>
              {filteredLinks.length} link{filteredLinks.length !== 1 ? 's' : ''} available
              {pinnedIds.size > 0 && (
                <span className="ml-2 text-primary">
                  ({pinnedIds.size} pinned)
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/resources/quick-links">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Manage links">
                <Settings2 className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8"
              title="Refresh links"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="quick-links" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Quick Links
            </TabsTrigger>
            {/* Structure supports adding additional tabs in the future */}
          </TabsList>

          <TabsContent value="quick-links" className="mt-0">
            {/* Search and filters */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search links..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as QuickLinkSortOption)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(v) => setPageSize(parseInt(v, 10) as QuickLinkPageSize)}
                >
                  <SelectTrigger className="w-[80px] h-9">
                    <SelectValue placeholder="Per page" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pin error message */}
            {pinError && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {pinError}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 px-2"
                  onClick={() => setPinError(null)}
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* No results from search */}
            {filteredLinks.length === 0 && searchQuery && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No links found matching &quot;{searchQuery}&quot;
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </div>
            )}

            {/* Links grid */}
            {filteredLinks.length > 0 && (
              <>
                {sortBy === 'category' && groupedLinks ? (
                  // Grouped by category (pinned links shown first in each category)
                  <div className="space-y-6">
                    {/* Show pinned links section first if any are pinned */}
                    {pinnedIds.size > 0 && paginatedLinks.some(link => pinnedIds.has(link.id)) && (
                      <div>
                        <h3 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                          <Pin className="h-4 w-4" />
                          Pinned Links
                          <Badge variant="default" className="ml-1 text-xs">
                            {paginatedLinks.filter(link => pinnedIds.has(link.id)).length}
                          </Badge>
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {paginatedLinks.filter(link => pinnedIds.has(link.id)).map(renderLinkCard)}
                        </div>
                      </div>
                    )}
                    {Array.from(groupedLinks.entries()).map(([categoryName, categoryLinks]) => {
                      // Filter out pinned links from category display when in category view
                      const unpinnedCategoryLinks = categoryLinks.filter(link => !pinnedIds.has(link.id));
                      if (unpinnedCategoryLinks.length === 0) return null;
                      return (
                        <div key={categoryName}>
                          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            {categoryName}
                            <Badge variant="secondary" className="ml-1 text-xs">
                              {unpinnedCategoryLinks.length}
                            </Badge>
                          </h3>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {unpinnedCategoryLinks.map(renderLinkCard)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Flat grid (alphabetical or custom order) - pinned items already at top
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {paginatedLinks.map(renderLinkCard)}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * pageSize + 1} -{' '}
                      {Math.min(currentPage * pageSize, filteredLinks.length)} of{' '}
                      {filteredLinks.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Disclaimer message about pinned links */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  Pinned links are stored locally in your browser and are not saved to the database.
                  Clearing browser data may reset your pinned items.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Structure for future tabs - can add more TabsContent here */}
        </Tabs>
      </CardContent>
    </Card>
  );
}
