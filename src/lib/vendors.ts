/**
 * Vendor Service
 *
 * Manages vendor CRUD operations with Zod validation.
 * Provides data access functions for the Vendor model.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { Vendor, VendorStatus } from '@/types';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Zod schema for vendor status
 */
export const vendorStatusSchema = z.enum(['active', 'inactive']);

/**
 * Zod schema for creating a vendor
 */
export const createVendorSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  address: z
    .string()
    .max(500, 'Address must be at most 500 characters')
    .optional()
    .nullable(),
  location: z
    .string()
    .max(255, 'Location must be at most 255 characters')
    .optional()
    .nullable(),
  serviceDescription: z
    .string()
    .max(5000, 'Service description must be at most 5000 characters')
    .optional()
    .nullable(),
  status: vendorStatusSchema.optional().default('active'),
});

/**
 * Zod schema for updating a vendor
 */
export const updateVendorSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters')
    .optional(),
  address: z
    .string()
    .max(500, 'Address must be at most 500 characters')
    .optional()
    .nullable(),
  location: z
    .string()
    .max(255, 'Location must be at most 255 characters')
    .optional()
    .nullable(),
  serviceDescription: z
    .string()
    .max(5000, 'Service description must be at most 5000 characters')
    .optional()
    .nullable(),
  status: vendorStatusSchema.optional(),
  includeInWeeklyReports: z.boolean().optional(),
});

/**
 * Zod schema for vendor ID parameter
 */
export const vendorIdSchema = z.string().cuid('Invalid vendor ID format');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input type for creating a vendor
 */
export type CreateVendorInput = z.infer<typeof createVendorSchema>;

/**
 * Input type for updating a vendor
 */
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

/**
 * Vendor with tags from database
 */
export interface VendorWithTags extends Omit<Vendor, 'tags'> {
  tags: Array<{
    tag: {
      id: string;
      name: string;
      color: string | null;
    };
  }>;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate vendor input using Zod schema
 * Returns a consistent validation result
 */
export function validateCreateVendorInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: CreateVendorInput;
} {
  const result = createVendorSchema.safeParse(input);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      data: result.data,
    };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join('.')}: ${issue.message}`
        : issue.message
    ),
  };
}

/**
 * Validate vendor update input using Zod schema
 */
export function validateUpdateVendorInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: UpdateVendorInput;
} {
  const result = updateVendorSchema.safeParse(input);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      data: result.data,
    };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join('.')}: ${issue.message}`
        : issue.message
    ),
  };
}

/**
 * Validate vendor ID
 */
export function validateVendorId(id: unknown): {
  valid: boolean;
  errors: string[];
  data?: string;
} {
  const result = vendorIdSchema.safeParse(id);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      data: result.data,
    };
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
 * Transform database vendor to API type
 */
function transformVendor(dbVendor: {
  id: string;
  name: string;
  address: string | null;
  location: string | null;
  serviceDescription: string | null;
  status: 'active' | 'inactive';
  includeInWeeklyReports: boolean;
  contractStartDate: Date | null;
  contractEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tags?: Array<{
    tag: {
      id: string;
      name: string;
      color: string | null;
    };
  }>;
}): Vendor {
  return {
    id: dbVendor.id,
    name: dbVendor.name,
    address: dbVendor.address ?? undefined,
    location: dbVendor.location ?? undefined,
    serviceDescription: dbVendor.serviceDescription ?? undefined,
    status: dbVendor.status as VendorStatus,
    includeInWeeklyReports: dbVendor.includeInWeeklyReports,
    contractStartDate: dbVendor.contractStartDate ?? undefined,
    contractEndDate: dbVendor.contractEndDate ?? undefined,
    createdAt: dbVendor.createdAt,
    updatedAt: dbVendor.updatedAt,
    tags: dbVendor.tags?.map((vt) => ({
      id: vt.tag.id,
      name: vt.tag.name,
      color: vt.tag.color ?? undefined,
      createdAt: dbVendor.createdAt,
      updatedAt: dbVendor.updatedAt,
    })) ?? [],
  };
}

// ============================================================================
// DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all vendors from the database
 */
export async function getAllVendors(): Promise<Vendor[]> {
  const vendors = await prisma.vendor.findMany({
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: [{ name: 'asc' }],
  });

  return vendors.map(transformVendor);
}

/**
 * Get vendors with optional filtering
 */
export async function getVendors(options?: {
  status?: VendorStatus;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ vendors: Vendor[]; total: number }> {
  const where: {
    status?: 'active' | 'inactive';
    OR?: Array<{ name: { contains: string; mode: 'insensitive' } } | { serviceDescription: { contains: string; mode: 'insensitive' } }>;
  } = {};

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { serviceDescription: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }],
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.vendor.count({ where }),
  ]);

  return {
    vendors: vendors.map(transformVendor),
    total,
  };
}

/**
 * Get a vendor by ID
 */
export async function getVendorById(id: string): Promise<Vendor | null> {
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return vendor ? transformVendor(vendor) : null;
}

/**
 * Create a new vendor
 */
export async function createVendor(input: CreateVendorInput): Promise<Vendor> {
  const vendor = await prisma.vendor.create({
    data: {
      name: input.name,
      address: input.address ?? null,
      location: input.location ?? null,
      serviceDescription: input.serviceDescription ?? null,
      status: input.status ?? 'active',
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return transformVendor(vendor);
}

/**
 * Update an existing vendor
 */
export async function updateVendor(
  id: string,
  input: UpdateVendorInput
): Promise<Vendor | null> {
  // Check if vendor exists
  const existing = await prisma.vendor.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.serviceDescription !== undefined && { serviceDescription: input.serviceDescription }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.includeInWeeklyReports !== undefined && { includeInWeeklyReports: input.includeInWeeklyReports }),
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return transformVendor(vendor);
}

/**
 * Delete a vendor by ID
 */
export async function deleteVendor(id: string): Promise<boolean> {
  try {
    await prisma.vendor.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a vendor exists
 */
export async function vendorExists(id: string): Promise<boolean> {
  const count = await prisma.vendor.count({ where: { id } });
  return count > 0;
}

/**
 * Get vendor statistics
 */
export async function getVendorStats(): Promise<{
  totalVendors: number;
  activeVendors: number;
  inactiveVendors: number;
}> {
  const [total, active, inactive] = await Promise.all([
    prisma.vendor.count(),
    prisma.vendor.count({ where: { status: 'active' } }),
    prisma.vendor.count({ where: { status: 'inactive' } }),
  ]);

  return {
    totalVendors: total,
    activeVendors: active,
    inactiveVendors: inactive,
  };
}
