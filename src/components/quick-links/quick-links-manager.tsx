'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Link as LinkIcon,
  ExternalLink,
  FolderOpen,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Check,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type {
  QuickLinkWithCategory,
  LinkCategory,
  ApiResponse,
} from '@/types';
import { PRIORITY_CATEGORY_ORDER } from '@/types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sort categories according to priority order:
 * 1. "Generic" comes first
 * 2. Fixed priority categories in specific order (Product, Documentation, Jira, Confluence, HR)
 * 3. All other categories alphabetically A-Z
 */
function sortCategoriesWithPriority(categories: (LinkCategory & { linkCount?: number })[]): (LinkCategory & { linkCount?: number })[] {
  const priorityOrder = PRIORITY_CATEGORY_ORDER.map(name => name.toLowerCase());

  return [...categories].sort((a, b) => {
    const aNameLower = a.displayName.toLowerCase();
    const bNameLower = b.displayName.toLowerCase();

    const aIndex = priorityOrder.indexOf(aNameLower);
    const bIndex = priorityOrder.indexOf(bNameLower);

    // Both are priority categories - sort by priority order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // Only a is a priority category - it comes first
    if (aIndex !== -1) {
      return -1;
    }

    // Only b is a priority category - it comes first
    if (bIndex !== -1) {
      return 1;
    }

    // Neither is a priority category - sort alphabetically
    return a.displayName.localeCompare(b.displayName);
  });
}

/**
 * Extract domain from URL for favicon fetching
 */
function extractDomain(url: string): string | null {
  try {
    // Add protocol if missing
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

interface QuickLinksManagerProps {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageCategories: boolean;
}

export function QuickLinksManager({
  canCreate,
  canEdit,
  canDelete,
  canManageCategories,
}: QuickLinksManagerProps) {
  // State
  const [links, setLinks] = useState<QuickLinkWithCategory[]>([]);
  const [categories, setCategories] = useState<(LinkCategory & { linkCount?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Dialog state
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLinkWithCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<LinkCategory | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'link' | 'category'; item: QuickLinkWithCategory | LinkCategory } | null>(null);

  // Form state
  const [linkForm, setLinkForm] = useState({
    title: '',
    url: '',
    icon: '',
    description: '',
    categoryId: '',
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category dropdown search state
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categorySearchInputRef = useRef<HTMLInputElement>(null);

  // Favicon state
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [faviconLoading, setFaviconLoading] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  // Sort categories with priority ordering
  const sortedCategories = useMemo(() => sortCategoriesWithPriority(categories), [categories]);

  // Filter categories based on search query (substring match)
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) {
      return sortedCategories;
    }
    const query = categorySearchQuery.toLowerCase();
    return sortedCategories.filter(cat =>
      cat.displayName.toLowerCase().includes(query)
    );
  }, [sortedCategories, categorySearchQuery]);

  // Get selected category display name
  const selectedCategoryName = useMemo(() => {
    const selected = categories.find(cat => cat.id === linkForm.categoryId);
    return selected?.displayName || 'Select a category';
  }, [categories, linkForm.categoryId]);

  // Fetch favicon when URL changes
  useEffect(() => {
    if (!linkForm.url) {
      setFaviconUrl(null);
      setFaviconError(false);
      return;
    }

    const domain = extractDomain(linkForm.url);
    if (!domain) {
      setFaviconUrl(null);
      setFaviconError(true);
      return;
    }

    setFaviconLoading(true);
    setFaviconError(false);

    const favicon = getFaviconUrl(domain);

    // Test if favicon loads successfully
    const img = new Image();
    img.onload = () => {
      setFaviconUrl(favicon);
      setFaviconLoading(false);
      setFaviconError(false);
    };
    img.onerror = () => {
      setFaviconUrl(null);
      setFaviconLoading(false);
      setFaviconError(true);
    };
    img.src = favicon;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [linkForm.url]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isCategoryDropdownOpen && categorySearchInputRef.current) {
      // Small delay to ensure popover is fully rendered
      setTimeout(() => {
        categorySearchInputRef.current?.focus();
      }, 50);
    }
  }, [isCategoryDropdownOpen]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [linksRes, categoriesRes] = await Promise.all([
        fetch('/api/quick-links?sortBy=category'),
        fetch('/api/quick-links/categories?includeLinkCounts=true'),
      ]);

      const [linksData, categoriesData]: [
        ApiResponse<{ links: QuickLinkWithCategory[]; total: number }>,
        ApiResponse<{ categories: (LinkCategory & { linkCount?: number })[] }>
      ] = await Promise.all([linksRes.json(), categoriesRes.json()]);

      if (!linksData.success) {
        throw new Error(linksData.error || 'Failed to fetch links');
      }
      if (!categoriesData.success) {
        throw new Error(categoriesData.error || 'Failed to fetch categories');
      }

      setLinks(linksData.data?.links || []);
      setCategories(categoriesData.data?.categories || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter links
  const filteredLinks = links.filter((link) => {
    const matchesSearch =
      !searchQuery ||
      link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.url.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || link.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Open dialogs
  const openCreateLink = () => {
    setEditingLink(null);
    // Default to "Generic" category if available, otherwise first category
    const genericCat = sortedCategories.find(cat => cat.name === 'generic');
    setLinkForm({
      title: '',
      url: '',
      icon: '',
      description: '',
      categoryId: genericCat?.id || sortedCategories[0]?.id || '',
    });
    setFormError(null);
    setCategorySearchQuery('');
    setFaviconUrl(null);
    setFaviconError(false);
    setIsLinkDialogOpen(true);
  };

  const openEditLink = (link: QuickLinkWithCategory) => {
    setEditingLink(link);
    setLinkForm({
      title: link.title,
      url: link.url,
      icon: link.icon || '',
      description: link.description || '',
      categoryId: link.categoryId,
    });
    setFormError(null);
    setCategorySearchQuery('');
    // Set favicon for existing link
    const domain = extractDomain(link.url);
    if (domain) {
      setFaviconUrl(getFaviconUrl(domain));
    }
    setIsLinkDialogOpen(true);
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '' });
    setFormError(null);
    setIsCategoryDialogOpen(true);
  };

  const openEditCategory = (category: LinkCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.displayName,
      description: category.description || '',
    });
    setFormError(null);
    setIsCategoryDialogOpen(true);
  };

  const openDelete = (type: 'link' | 'category', item: QuickLinkWithCategory | LinkCategory) => {
    setDeletingItem({ type, item });
    setIsDeleteDialogOpen(true);
  };

  // Submit handlers
  const handleSubmitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const url = editingLink
        ? `/api/quick-links/${editingLink.id}`
        : '/api/quick-links';
      const method = editingLink ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(linkForm),
      });

      const data: ApiResponse<QuickLinkWithCategory> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save link');
      }

      setIsLinkDialogOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const url = editingCategory
        ? `/api/quick-links/categories/${editingCategory.id}`
        : '/api/quick-links/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      });

      const data: ApiResponse<LinkCategory> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save category');
      }

      setIsCategoryDialogOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);

    try {
      const url =
        deletingItem.type === 'link'
          ? `/api/quick-links/${deletingItem.item.id}`
          : `/api/quick-links/categories/${deletingItem.item.id}`;

      const response = await fetch(url, { method: 'DELETE' });
      const data: ApiResponse<{ deleted: boolean }> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete');
      }

      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="links" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="links">Quick Links</TabsTrigger>
            {canManageCategories && (
              <TabsTrigger value="categories">Categories</TabsTrigger>
            )}
          </TabsList>
          <div className="flex gap-2">
            {canManageCategories && (
              <Button variant="outline" size="sm" onClick={openCreateCategory}>
                <FolderOpen className="h-4 w-4 mr-2" />
                New Category
              </Button>
            )}
            {canCreate && (
              <Button size="sm" onClick={openCreateLink}>
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            )}
          </div>
        </div>

        {/* Links Tab */}
        <TabsContent value="links" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Quick Links</CardTitle>
              <CardDescription>
                View, add, edit, and delete quick links that appear on the dashboard
              </CardDescription>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search links..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.displayName} ({cat.linkCount || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <LinkIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  {links.length === 0 ? (
                    <>
                      <h3 className="font-medium">No quick links yet</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add your first quick link to get started
                      </p>
                      {canCreate && (
                        <Button size="sm" onClick={openCreateLink} className="mt-4">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Link
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="font-medium">No links found</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Try adjusting your search or filter
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell className="font-medium">{link.title}</TableCell>
                        <TableCell>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <span className="truncate max-w-[200px]">{link.url}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{link.category.displayName}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {link.description || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditLink(link)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => openDelete('link', link)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        {canManageCategories && (
          <TabsContent value="categories" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Manage Categories</CardTitle>
                <CardDescription>
                  Organize your quick links into categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Links</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.displayName}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {category.description || '-'}
                        </TableCell>
                        <TableCell>{category.linkCount || 0}</TableCell>
                        <TableCell>
                          {category.isDefault ? (
                            <Badge variant="outline">Default</Badge>
                          ) : (
                            <Badge variant="secondary">Custom</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditCategory(category)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {category.name !== 'generic' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => openDelete('category', category)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingLink ? 'Edit Quick Link' : 'Add Quick Link'}
            </DialogTitle>
            <DialogDescription>
              {editingLink
                ? 'Update the quick link details below'
                : 'Add a new quick link to appear on the dashboard'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitLink}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={linkForm.title}
                  onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                  placeholder="e.g., Jira Board"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">
                  URL <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="url"
                      type="url"
                      value={linkForm.url}
                      onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                      placeholder="https://example.com"
                      required
                      className="pr-10"
                    />
                    {/* Favicon preview inside input */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {faviconLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : faviconUrl && !faviconError ? (
                        <img
                          src={faviconUrl}
                          alt="Site icon"
                          className="h-4 w-4 rounded-sm"
                          onError={() => setFaviconError(true)}
                        />
                      ) : linkForm.url ? (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      ) : null}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  URL will be automatically normalized with https:// if needed. Favicon is retrieved automatically.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-destructive">*</span>
                </Label>
                {/* Searchable Category Dropdown */}
                <Popover
                  open={isCategoryDropdownOpen}
                  onOpenChange={(open) => {
                    setIsCategoryDropdownOpen(open);
                    if (!open) {
                      setCategorySearchQuery('');
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isCategoryDropdownOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedCategoryName}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 overflow-hidden" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          ref={categorySearchInputRef}
                          placeholder="Search categories..."
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          className="pl-8 h-9"
                        />
                      </div>
                    </div>
                    <div
                      className="max-h-[300px] overflow-y-scroll p-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      {filteredCategories.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          No categories found matching &quot;{categorySearchQuery}&quot;
                        </div>
                      ) : (
                        filteredCategories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setLinkForm({ ...linkForm, categoryId: cat.id });
                              setIsCategoryDropdownOpen(false);
                              setCategorySearchQuery('');
                            }}
                            className={cn(
                              'flex items-center w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground',
                              'cursor-pointer transition-colors',
                              linkForm.categoryId === cat.id && 'bg-accent'
                            )}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                linkForm.categoryId === cat.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {cat.displayName}
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={linkForm.description}
                  onChange={(e) => setLinkForm({ ...linkForm, description: e.target.value })}
                  placeholder="Brief description of this link"
                  rows={2}
                />
              </div>
              {formError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {formError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLinkDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingLink ? 'Save Changes' : 'Add Link'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category details below'
                : 'Create a new category to organize your links'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCategory}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cat-name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g., Internal Tools"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-description">Description</Label>
                <Textarea
                  id="cat-description"
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  placeholder="Brief description of this category"
                  rows={2}
                />
              </div>
              {formError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {formError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoryDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Add Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              {deletingItem?.type === 'link' ? (
                <>
                  Are you sure you want to delete the link &quot;
                  {(deletingItem.item as QuickLinkWithCategory).title}&quot;?
                </>
              ) : (
                <>
                  Are you sure you want to delete the category &quot;
                  {(deletingItem?.item as LinkCategory)?.displayName}&quot;?
                  {(deletingItem?.item as LinkCategory & { linkCount?: number })?.linkCount ? (
                    <span className="block mt-2 text-destructive">
                      Warning: {(deletingItem?.item as LinkCategory & { linkCount?: number })?.linkCount} links will be
                      moved to the &quot;Generic&quot; category.
                    </span>
                  ) : null}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingItem(null);
                setFormError(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
