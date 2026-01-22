/**
 * Quick Links Service
 *
 * Manages quick link and category CRUD operations with Zod validation.
 * Provides data access functions for the QuickLink and LinkCategory models.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { QuickLink, LinkCategory, QuickLinkWithCategory } from '@/types';

// ============================================================================
// DEFAULT CATEGORIES
// ============================================================================

export const DEFAULT_CATEGORIES: string[] = [
  'Dev Tools',
  'Documentation',
  'Communication',
  'CI/CD',
  'Monitoring',
  'Version Control',
  'Project Management',
  'Design Tools',
  'Testing',
  'Cloud Services',
  'API Resources',
  'Knowledge Base',
  'Security Tools',
  'Databases',
  'Code Review',
  'HR',
  'Product',
  'Jira',
  'Confluence',
  'Generic',
];

// ============================================================================
// URL VALIDATION & NORMALIZATION
// ============================================================================

/**
 * URL regex pattern for validation
 * Supports http, https, and URLs without protocol
 */
const URL_PATTERN = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?(\?[^\s]*)?(#[^\s]*)?$/i;

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    // First try direct URL parsing
    new URL(url);
    return true;
  } catch {
    // If it fails, try with https prefix
    try {
      new URL(`https://${url}`);
      return URL_PATTERN.test(url);
    } catch {
      return false;
    }
  }
}

/**
 * Normalize URL - ensure https:// prefix if missing
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();

  // Already has protocol
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Remove any protocol-like prefix that isn't http/https
  const cleaned = trimmed.replace(/^[a-z]+:\/\//i, '');

  // Add https:// prefix
  return `https://${cleaned}`;
}

/**
 * Maximum URL length (2048 is standard max URL length)
 */
const MAX_URL_LENGTH = 2048;

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Zod schema for creating a link category
 */
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be at most 100 characters')
    .transform(val => val.trim()),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .nullable(),
  sortOrder: z.number().int().min(0).optional().default(0),
});

/**
 * Zod schema for updating a link category
 */
export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be at most 100 characters')
    .transform(val => val.trim())
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional()
    .nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * Zod schema for creating a quick link
 */
export const createQuickLinkSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters')
    .transform(val => val.trim()),
  url: z
    .string()
    .min(1, 'URL is required')
    .max(MAX_URL_LENGTH, `URL must be at most ${MAX_URL_LENGTH} characters`)
    .refine(val => isValidUrl(val), 'Invalid URL format')
    .transform(val => normalizeUrl(val)),
  icon: z
    .string()
    .max(50, 'Icon name must be at most 50 characters')
    .optional()
    .nullable(),
  description: z
    .string()
    .max(1000, 'Description must be at most 1000 characters')
    .optional()
    .nullable(),
  categoryId: z.string().cuid('Invalid category ID format'),
  sortOrder: z.number().int().min(0).optional().default(0),
});

/**
 * Zod schema for updating a quick link
 */
export const updateQuickLinkSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters')
    .transform(val => val.trim())
    .optional(),
  url: z
    .string()
    .min(1, 'URL is required')
    .max(MAX_URL_LENGTH, `URL must be at most ${MAX_URL_LENGTH} characters`)
    .refine(val => isValidUrl(val), 'Invalid URL format')
    .transform(val => normalizeUrl(val))
    .optional(),
  icon: z
    .string()
    .max(50, 'Icon name must be at most 50 characters')
    .optional()
    .nullable(),
  description: z
    .string()
    .max(1000, 'Description must be at most 1000 characters')
    .optional()
    .nullable(),
  categoryId: z.string().cuid('Invalid category ID format').optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * Zod schema for bulk updating quick link sort orders
 */
export const bulkUpdateSortOrderSchema = z.array(
  z.object({
    id: z.string().cuid('Invalid link ID format'),
    sortOrder: z.number().int().min(0),
  })
);

/**
 * Zod schema for ID parameter
 */
export const idSchema = z.string().cuid('Invalid ID format');

// ============================================================================
// TYPES
// ============================================================================

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateQuickLinkInput = z.infer<typeof createQuickLinkSchema>;
export type UpdateQuickLinkInput = z.infer<typeof updateQuickLinkSchema>;
export type BulkUpdateSortOrderInput = z.infer<typeof bulkUpdateSortOrderSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate category input
 */
export function validateCreateCategoryInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: CreateCategoryInput;
} {
  const result = createCategorySchema.safeParse(input);
  if (result.success) {
    return { valid: true, errors: [], data: result.data };
  }
  return {
    valid: false,
    errors: result.error.issues.map((issue) =>
      issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message
    ),
  };
}

/**
 * Validate category update input
 */
export function validateUpdateCategoryInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: UpdateCategoryInput;
} {
  const result = updateCategorySchema.safeParse(input);
  if (result.success) {
    return { valid: true, errors: [], data: result.data };
  }
  return {
    valid: false,
    errors: result.error.issues.map((issue) =>
      issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message
    ),
  };
}

/**
 * Validate quick link input
 */
export function validateCreateQuickLinkInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: CreateQuickLinkInput;
} {
  const result = createQuickLinkSchema.safeParse(input);
  if (result.success) {
    return { valid: true, errors: [], data: result.data };
  }
  return {
    valid: false,
    errors: result.error.issues.map((issue) =>
      issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message
    ),
  };
}

/**
 * Validate quick link update input
 */
export function validateUpdateQuickLinkInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: UpdateQuickLinkInput;
} {
  const result = updateQuickLinkSchema.safeParse(input);
  if (result.success) {
    return { valid: true, errors: [], data: result.data };
  }
  return {
    valid: false,
    errors: result.error.issues.map((issue) =>
      issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message
    ),
  };
}

/**
 * Validate ID parameter
 */
export function validateId(id: unknown): {
  valid: boolean;
  errors: string[];
  data?: string;
} {
  const result = idSchema.safeParse(id);
  if (result.success) {
    return { valid: true, errors: [], data: result.data };
  }
  return {
    valid: false,
    errors: result.error.issues.map((issue) => issue.message),
  };
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

/**
 * Transform database category to API type
 */
function transformCategory(dbCategory: {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  sortOrder: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}): LinkCategory {
  return {
    id: dbCategory.id,
    name: dbCategory.name,
    displayName: dbCategory.displayName,
    description: dbCategory.description ?? undefined,
    sortOrder: dbCategory.sortOrder,
    isDefault: dbCategory.isDefault,
    createdAt: dbCategory.createdAt,
    updatedAt: dbCategory.updatedAt,
  };
}

/**
 * Transform database quick link to API type
 */
function transformQuickLink(dbLink: {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  description: string | null;
  categoryId: string;
  sortOrder: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  category?: {
    id: string;
    name: string;
    displayName: string;
    description: string | null;
    sortOrder: number;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}): QuickLink | QuickLinkWithCategory {
  const base: QuickLink = {
    id: dbLink.id,
    title: dbLink.title,
    url: dbLink.url,
    icon: dbLink.icon ?? undefined,
    description: dbLink.description ?? undefined,
    categoryId: dbLink.categoryId,
    sortOrder: dbLink.sortOrder,
    createdBy: dbLink.createdBy,
    createdAt: dbLink.createdAt,
    updatedAt: dbLink.updatedAt,
  };

  if (dbLink.category) {
    return {
      ...base,
      category: transformCategory(dbLink.category),
    } as QuickLinkWithCategory;
  }

  return base;
}

// ============================================================================
// CATEGORY DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<LinkCategory[]> {
  const categories = await prisma.linkCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
  });
  return categories.map(transformCategory);
}

/**
 * Get a category by ID
 */
export async function getCategoryById(id: string): Promise<LinkCategory | null> {
  const category = await prisma.linkCategory.findUnique({
    where: { id },
  });
  return category ? transformCategory(category) : null;
}

/**
 * Get a category by name (case-insensitive)
 */
export async function getCategoryByName(name: string): Promise<LinkCategory | null> {
  const normalizedName = name.toLowerCase().trim();
  const category = await prisma.linkCategory.findUnique({
    where: { name: normalizedName },
  });
  return category ? transformCategory(category) : null;
}

/**
 * Get the default "Generic" category (for reassignment when categories are deleted)
 */
export async function getGenericCategory(): Promise<LinkCategory> {
  let category = await prisma.linkCategory.findUnique({
    where: { name: 'generic' },
  });

  // Create if doesn't exist
  if (!category) {
    category = await prisma.linkCategory.create({
      data: {
        name: 'generic',
        displayName: 'Generic',
        isDefault: true,
        sortOrder: 999, // Put at end
      },
    });
  }

  return transformCategory(category);
}

/**
 * Create a new category
 */
export async function createCategory(input: CreateCategoryInput): Promise<LinkCategory> {
  const normalizedName = input.name.toLowerCase();

  // Check for duplicate (case-insensitive)
  const existing = await prisma.linkCategory.findUnique({
    where: { name: normalizedName },
  });

  if (existing) {
    throw new Error('A category with this name already exists');
  }

  const category = await prisma.linkCategory.create({
    data: {
      name: normalizedName,
      displayName: input.name,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
      isDefault: false,
    },
  });

  return transformCategory(category);
}

/**
 * Update a category
 */
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<LinkCategory | null> {
  const existing = await prisma.linkCategory.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  // If name is being updated, check for duplicates
  if (input.name) {
    const normalizedName = input.name.toLowerCase();
    const duplicate = await prisma.linkCategory.findFirst({
      where: {
        name: normalizedName,
        id: { not: id },
      },
    });
    if (duplicate) {
      throw new Error('A category with this name already exists');
    }
  }

  const category = await prisma.linkCategory.update({
    where: { id },
    data: {
      ...(input.name !== undefined && {
        name: input.name.toLowerCase(),
        displayName: input.name,
      }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    },
  });

  return transformCategory(category);
}

/**
 * Delete a category
 * Reassigns all links in this category to "Generic"
 */
export async function deleteCategory(id: string): Promise<boolean> {
  const existing = await prisma.linkCategory.findUnique({ where: { id } });
  if (!existing) {
    return false;
  }

  // Prevent deletion of "Generic" category
  if (existing.name === 'generic') {
    throw new Error('Cannot delete the Generic category');
  }

  // Get or create Generic category for reassignment
  const genericCategory = await getGenericCategory();

  // Reassign all links in this category to Generic
  await prisma.quickLink.updateMany({
    where: { categoryId: id },
    data: { categoryId: genericCategory.id },
  });

  // Delete the category
  await prisma.linkCategory.delete({ where: { id } });
  return true;
}

/**
 * Check if a category has links
 */
export async function categoryHasLinks(id: string): Promise<boolean> {
  const count = await prisma.quickLink.count({ where: { categoryId: id } });
  return count > 0;
}

/**
 * Get link count by category
 */
export async function getLinkCountByCategory(): Promise<Record<string, number>> {
  const counts = await prisma.quickLink.groupBy({
    by: ['categoryId'],
    _count: { id: true },
  });

  const result: Record<string, number> = {};
  for (const count of counts) {
    result[count.categoryId] = count._count.id;
  }
  return result;
}

/**
 * Initialize default categories - creates any missing defaults
 * Uses skipDuplicates to safely handle existing categories
 */
export async function initializeDefaultCategories(): Promise<void> {
  const categories = DEFAULT_CATEGORIES.map((name, index) => ({
    name: name.toLowerCase(),
    displayName: name,
    isDefault: true,
    sortOrder: index,
  }));

  await prisma.linkCategory.createMany({
    data: categories,
    skipDuplicates: true,
  });
}

// ============================================================================
// QUICK LINK DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all quick links with categories
 */
export async function getAllQuickLinks(): Promise<QuickLinkWithCategory[]> {
  const links = await prisma.quickLink.findMany({
    include: { category: true },
    orderBy: [
      { category: { sortOrder: 'asc' } },
      { sortOrder: 'asc' },
      { title: 'asc' },
    ],
  });
  return links.map(transformQuickLink) as QuickLinkWithCategory[];
}

/**
 * Get quick links with filtering, pagination, and search
 */
export async function getQuickLinks(options?: {
  search?: string;
  categoryId?: string;
  sortBy?: 'category' | 'alphabetical' | 'custom';
  limit?: number;
  offset?: number;
}): Promise<{ links: QuickLinkWithCategory[]; total: number }> {
  interface WhereClause {
    categoryId?: string;
    OR?: Array<{
      title?: { contains: string; mode: 'insensitive' };
      description?: { contains: string; mode: 'insensitive' };
      url?: { contains: string; mode: 'insensitive' };
      category?: { displayName: { contains: string; mode: 'insensitive' } };
    }>;
  }

  const where: WhereClause = {};

  if (options?.categoryId) {
    where.categoryId = options.categoryId;
  }

  if (options?.search) {
    where.OR = [
      { title: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
      { url: { contains: options.search, mode: 'insensitive' } },
      { category: { displayName: { contains: options.search, mode: 'insensitive' } } },
    ];
  }

  // Determine sort order
  type OrderByType = Array<
    | { category: { sortOrder: 'asc' | 'desc' } }
    | { category: { displayName: 'asc' | 'desc' } }
    | { sortOrder: 'asc' | 'desc' }
    | { title: 'asc' | 'desc' }
  >;

  let orderBy: OrderByType;
  switch (options?.sortBy) {
    case 'alphabetical':
      orderBy = [{ title: 'asc' }];
      break;
    case 'custom':
      orderBy = [{ sortOrder: 'asc' }, { title: 'asc' }];
      break;
    case 'category':
    default:
      orderBy = [
        { category: { sortOrder: 'asc' } },
        { category: { displayName: 'asc' } },
        { sortOrder: 'asc' },
        { title: 'asc' },
      ];
      break;
  }

  const [links, total] = await Promise.all([
    prisma.quickLink.findMany({
      where,
      include: { category: true },
      orderBy,
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.quickLink.count({ where }),
  ]);

  return {
    links: links.map(transformQuickLink) as QuickLinkWithCategory[],
    total,
  };
}

/**
 * Get a quick link by ID
 */
export async function getQuickLinkById(id: string): Promise<QuickLinkWithCategory | null> {
  const link = await prisma.quickLink.findUnique({
    where: { id },
    include: { category: true },
  });
  return link ? (transformQuickLink(link) as QuickLinkWithCategory) : null;
}

/**
 * Create a new quick link
 */
export async function createQuickLink(
  input: CreateQuickLinkInput,
  createdBy: string
): Promise<QuickLinkWithCategory> {
  // Verify category exists
  const category = await prisma.linkCategory.findUnique({
    where: { id: input.categoryId },
  });
  if (!category) {
    throw new Error('Category not found');
  }

  const link = await prisma.quickLink.create({
    data: {
      title: input.title,
      url: input.url,
      icon: input.icon ?? null,
      description: input.description ?? null,
      categoryId: input.categoryId,
      sortOrder: input.sortOrder ?? 0,
      createdBy,
    },
    include: { category: true },
  });

  return transformQuickLink(link) as QuickLinkWithCategory;
}

/**
 * Update a quick link
 */
export async function updateQuickLink(
  id: string,
  input: UpdateQuickLinkInput
): Promise<QuickLinkWithCategory | null> {
  const existing = await prisma.quickLink.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  // If changing category, verify it exists
  if (input.categoryId) {
    const category = await prisma.linkCategory.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) {
      throw new Error('Category not found');
    }
  }

  const link = await prisma.quickLink.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.url !== undefined && { url: input.url }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    },
    include: { category: true },
  });

  return transformQuickLink(link) as QuickLinkWithCategory;
}

/**
 * Delete a quick link
 */
export async function deleteQuickLink(id: string): Promise<boolean> {
  try {
    await prisma.quickLink.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Bulk update sort orders for quick links
 */
export async function bulkUpdateSortOrders(
  updates: BulkUpdateSortOrderInput
): Promise<void> {
  await prisma.$transaction(
    updates.map(({ id, sortOrder }) =>
      prisma.quickLink.update({
        where: { id },
        data: { sortOrder },
      })
    )
  );
}

/**
 * Get quick links statistics
 */
export async function getQuickLinksStats(): Promise<{
  totalLinks: number;
  totalCategories: number;
  linksByCategory: Array<{ category: string; count: number }>;
}> {
  const [totalLinks, totalCategories, linksByCategory] = await Promise.all([
    prisma.quickLink.count(),
    prisma.linkCategory.count(),
    prisma.quickLink.groupBy({
      by: ['categoryId'],
      _count: { id: true },
    }),
  ]);

  // Get category names
  const categoryIds = linksByCategory.map((g) => g.categoryId);
  const categories = await prisma.linkCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, displayName: true },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c.displayName]));

  return {
    totalLinks,
    totalCategories,
    linksByCategory: linksByCategory.map((g) => ({
      category: categoryMap.get(g.categoryId) || 'Unknown',
      count: g._count.id,
    })),
  };
}

/**
 * Check if quick link exists
 */
export async function quickLinkExists(id: string): Promise<boolean> {
  const count = await prisma.quickLink.count({ where: { id } });
  return count > 0;
}
