/**
 * Rate Card Service
 *
 * Manages rate card CRUD operations with Zod validation.
 * Rate cards define vendor-specific pricing by role with effective date ranges,
 * supporting multiple currencies and historical tracking.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { isValidCurrencyCode } from '@/lib/currency/currencies';
import type { RateCard } from '@/types';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Zod schema for currency validation
 */
export const currencySchema = z
  .string()
  .length(3, 'Currency code must be exactly 3 characters')
  .refine((val) => isValidCurrencyCode(val), {
    message: 'Invalid currency code',
  });

/**
 * Zod schema for creating a rate card
 */
export const createRateCardSchema = z.object({
  vendorId: z.string().cuid('Invalid vendor ID format'),
  roleId: z.string().cuid('Invalid role ID format'),
  rate: z
    .number()
    .positive('Rate must be a positive number')
    .max(9999999999.99, 'Rate exceeds maximum allowed value'),
  currency: currencySchema.optional().default('GBP'),
  effectiveFrom: z
    .string()
    .min(1, 'Effective from date is required')
    .transform((val) => new Date(val)),
  effectiveTo: z
    .string()
    .transform((val) => new Date(val))
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(5000, 'Notes must be at most 5000 characters')
    .optional()
    .nullable(),
}).refine(
  (data) => {
    if (data.effectiveTo && data.effectiveFrom) {
      return data.effectiveTo > data.effectiveFrom;
    }
    return true;
  },
  {
    message: 'Effective to date must be after effective from date',
    path: ['effectiveTo'],
  }
);

/**
 * Zod schema for updating a rate card
 */
export const updateRateCardSchema = z.object({
  vendorId: z.string().cuid('Invalid vendor ID format').optional(),
  roleId: z.string().cuid('Invalid role ID format').optional(),
  rate: z
    .number()
    .positive('Rate must be a positive number')
    .max(9999999999.99, 'Rate exceeds maximum allowed value')
    .optional(),
  currency: currencySchema.optional(),
  effectiveFrom: z
    .string()
    .min(1, 'Effective from date is required')
    .transform((val) => new Date(val))
    .optional(),
  effectiveTo: z
    .string()
    .transform((val) => new Date(val))
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(5000, 'Notes must be at most 5000 characters')
    .optional()
    .nullable(),
});

/**
 * Zod schema for rate card ID parameter
 */
export const rateCardIdSchema = z.string().cuid('Invalid rate card ID format');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input type for creating a rate card
 */
export type CreateRateCardInput = z.infer<typeof createRateCardSchema>;

/**
 * Input type for updating a rate card
 */
export type UpdateRateCardInput = z.infer<typeof updateRateCardSchema>;

/**
 * Rate card with vendor and role details
 */
export interface RateCardWithDetails extends RateCard {
  vendor: {
    id: string;
    name: string;
    status: string;
  };
  role: {
    id: string;
    name: string;
  };
}

/**
 * Rate card history entry for tracking changes over time
 */
export interface RateCardHistoryEntry {
  id: string;
  rate: number;
  currency: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  isActive: boolean;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate rate card input using Zod schema
 * Returns a consistent validation result
 */
export function validateCreateRateCardInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: CreateRateCardInput;
} {
  const result = createRateCardSchema.safeParse(input);

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
 * Validate rate card update input using Zod schema
 */
export function validateUpdateRateCardInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: UpdateRateCardInput;
} {
  const result = updateRateCardSchema.safeParse(input);

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
 * Validate rate card ID
 */
export function validateRateCardId(id: unknown): {
  valid: boolean;
  errors: string[];
  data?: string;
} {
  const result = rateCardIdSchema.safeParse(id);

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
 * Transform database rate card to API type
 */
function transformRateCard(dbRateCard: {
  id: string;
  vendorId: string;
  roleId: string;
  rate: { toNumber(): number } | number;
  currency: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  vendor?: {
    id: string;
    name: string;
    status: string;
  };
  role?: {
    id: string;
    name: string;
  };
}): RateCard | RateCardWithDetails {
  const rateValue = typeof dbRateCard.rate === 'number'
    ? dbRateCard.rate
    : dbRateCard.rate.toNumber();

  const base: RateCard = {
    id: dbRateCard.id,
    vendorId: dbRateCard.vendorId,
    roleId: dbRateCard.roleId,
    rate: rateValue,
    currency: dbRateCard.currency,
    effectiveFrom: dbRateCard.effectiveFrom,
    effectiveTo: dbRateCard.effectiveTo ?? undefined,
    notes: dbRateCard.notes ?? undefined,
    createdAt: dbRateCard.createdAt,
    updatedAt: dbRateCard.updatedAt,
  };

  if (dbRateCard.vendor && dbRateCard.role) {
    return {
      ...base,
      vendor: {
        id: dbRateCard.vendor.id,
        name: dbRateCard.vendor.name,
        status: dbRateCard.vendor.status,
      },
      role: {
        id: dbRateCard.role.id,
        name: dbRateCard.role.name,
      },
    };
  }

  return base;
}

/**
 * Check if a rate card is currently active based on effective dates
 */
function isRateCardActive(effectiveFrom: Date, effectiveTo: Date | null): boolean {
  const now = new Date();
  return effectiveFrom <= now && (effectiveTo === null || effectiveTo >= now);
}

// ============================================================================
// DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all rate cards from the database
 */
export async function getAllRateCards(): Promise<RateCardWithDetails[]> {
  const rateCards = await prisma.rateCard.findMany({
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { vendor: { name: 'asc' } },
      { role: { name: 'asc' } },
      { effectiveFrom: 'desc' },
    ],
  });

  return rateCards.map(transformRateCard) as RateCardWithDetails[];
}

/**
 * Get rate cards with optional filtering and pagination
 */
export async function getRateCards(options?: {
  vendorId?: string;
  roleId?: string;
  currency?: string;
  activeOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rateCards: RateCardWithDetails[]; total: number }> {
  const where: {
    vendorId?: string;
    roleId?: string;
    currency?: string;
    AND?: Array<{
      effectiveFrom?: { lte: Date };
      OR?: Array<{ effectiveTo: null } | { effectiveTo: { gte: Date } }>;
    }>;
    OR?: Array<
      | { vendor: { name: { contains: string; mode: 'insensitive' } } }
      | { role: { name: { contains: string; mode: 'insensitive' } } }
      | { notes: { contains: string; mode: 'insensitive' } }
    >;
  } = {};

  if (options?.vendorId) {
    where.vendorId = options.vendorId;
  }

  if (options?.roleId) {
    where.roleId = options.roleId;
  }

  if (options?.currency) {
    where.currency = options.currency.toUpperCase();
  }

  if (options?.activeOnly) {
    const now = new Date();
    where.AND = [
      { effectiveFrom: { lte: now } },
      { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
    ];
  }

  if (options?.search) {
    where.OR = [
      { vendor: { name: { contains: options.search, mode: 'insensitive' } } },
      { role: { name: { contains: options.search, mode: 'insensitive' } } },
      { notes: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [rateCards, total] = await Promise.all([
    prisma.rateCard.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { vendor: { name: 'asc' } },
        { role: { name: 'asc' } },
        { effectiveFrom: 'desc' },
      ],
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.rateCard.count({ where }),
  ]);

  return {
    rateCards: rateCards.map(transformRateCard) as RateCardWithDetails[],
    total,
  };
}

/**
 * Get a rate card by ID
 */
export async function getRateCardById(id: string): Promise<RateCardWithDetails | null> {
  const rateCard = await prisma.rateCard.findUnique({
    where: { id },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return rateCard ? (transformRateCard(rateCard) as RateCardWithDetails) : null;
}

/**
 * Get rate cards for a specific vendor
 */
export async function getRateCardsByVendor(vendorId: string): Promise<RateCardWithDetails[]> {
  const rateCards = await prisma.rateCard.findMany({
    where: { vendorId },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ role: { name: 'asc' } }, { effectiveFrom: 'desc' }],
  });

  return rateCards.map(transformRateCard) as RateCardWithDetails[];
}

/**
 * Get rate cards for a specific role
 */
export async function getRateCardsByRole(roleId: string): Promise<RateCardWithDetails[]> {
  const rateCards = await prisma.rateCard.findMany({
    where: { roleId },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ vendor: { name: 'asc' } }, { effectiveFrom: 'desc' }],
  });

  return rateCards.map(transformRateCard) as RateCardWithDetails[];
}

/**
 * Get the current active rate for a vendor-role combination
 */
export async function getCurrentRate(
  vendorId: string,
  roleId: string
): Promise<RateCardWithDetails | null> {
  const now = new Date();

  const rateCard = await prisma.rateCard.findFirst({
    where: {
      vendorId,
      roleId,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { effectiveFrom: 'desc' },
  });

  return rateCard ? (transformRateCard(rateCard) as RateCardWithDetails) : null;
}

/**
 * Get rate card history for a vendor-role combination
 */
export async function getRateCardHistory(
  vendorId: string,
  roleId: string
): Promise<RateCardHistoryEntry[]> {
  const rateCards = await prisma.rateCard.findMany({
    where: { vendorId, roleId },
    orderBy: { effectiveFrom: 'desc' },
  });

  return rateCards.map((rc) => ({
    id: rc.id,
    rate: typeof rc.rate === 'number' ? rc.rate : rc.rate.toNumber(),
    currency: rc.currency,
    effectiveFrom: rc.effectiveFrom,
    effectiveTo: rc.effectiveTo,
    createdAt: rc.createdAt,
    isActive: isRateCardActive(rc.effectiveFrom, rc.effectiveTo),
  }));
}

/**
 * Create a new rate card
 */
export async function createRateCard(input: CreateRateCardInput): Promise<RateCardWithDetails> {
  // Verify vendor exists
  const vendor = await prisma.vendor.findUnique({
    where: { id: input.vendorId },
  });
  if (!vendor) {
    throw new Error(`Vendor with ID "${input.vendorId}" not found`);
  }

  // Verify role exists
  const role = await prisma.role.findUnique({
    where: { id: input.roleId },
  });
  if (!role) {
    throw new Error(`Role with ID "${input.roleId}" not found`);
  }

  // Check for duplicate (same vendor, role, and effectiveFrom date)
  const existing = await prisma.rateCard.findUnique({
    where: {
      vendorId_roleId_effectiveFrom: {
        vendorId: input.vendorId,
        roleId: input.roleId,
        effectiveFrom: input.effectiveFrom,
      },
    },
  });

  if (existing) {
    throw new Error(
      `A rate card for this vendor and role with the same effective date already exists`
    );
  }

  const rateCard = await prisma.rateCard.create({
    data: {
      vendorId: input.vendorId,
      roleId: input.roleId,
      rate: input.rate,
      currency: (input.currency ?? 'GBP').toUpperCase(),
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
      notes: input.notes ?? null,
    },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return transformRateCard(rateCard) as RateCardWithDetails;
}

/**
 * Update an existing rate card
 */
export async function updateRateCard(
  id: string,
  input: UpdateRateCardInput
): Promise<RateCardWithDetails | null> {
  // Check if rate card exists
  const existing = await prisma.rateCard.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  // If changing vendor, verify new vendor exists
  if (input.vendorId && input.vendorId !== existing.vendorId) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: input.vendorId },
    });
    if (!vendor) {
      throw new Error(`Vendor with ID "${input.vendorId}" not found`);
    }
  }

  // If changing role, verify new role exists
  if (input.roleId && input.roleId !== existing.roleId) {
    const role = await prisma.role.findUnique({
      where: { id: input.roleId },
    });
    if (!role) {
      throw new Error(`Role with ID "${input.roleId}" not found`);
    }
  }

  // Check for duplicate if changing key fields
  if (input.vendorId || input.roleId || input.effectiveFrom) {
    const checkVendorId = input.vendorId ?? existing.vendorId;
    const checkRoleId = input.roleId ?? existing.roleId;
    const checkEffectiveFrom = input.effectiveFrom ?? existing.effectiveFrom;

    const duplicate = await prisma.rateCard.findFirst({
      where: {
        vendorId: checkVendorId,
        roleId: checkRoleId,
        effectiveFrom: checkEffectiveFrom,
        id: { not: id },
      },
    });

    if (duplicate) {
      throw new Error(
        `A rate card for this vendor and role with the same effective date already exists`
      );
    }
  }

  // Validate date range if both dates are provided
  if (input.effectiveFrom && input.effectiveTo) {
    if (input.effectiveTo <= input.effectiveFrom) {
      throw new Error('Effective to date must be after effective from date');
    }
  } else if (input.effectiveTo && !input.effectiveFrom) {
    if (input.effectiveTo <= existing.effectiveFrom) {
      throw new Error('Effective to date must be after effective from date');
    }
  } else if (input.effectiveFrom && existing.effectiveTo) {
    if (existing.effectiveTo <= input.effectiveFrom) {
      throw new Error('Effective to date must be after effective from date');
    }
  }

  const rateCard = await prisma.rateCard.update({
    where: { id },
    data: {
      ...(input.vendorId !== undefined && { vendorId: input.vendorId }),
      ...(input.roleId !== undefined && { roleId: input.roleId }),
      ...(input.rate !== undefined && { rate: input.rate }),
      ...(input.currency !== undefined && { currency: input.currency.toUpperCase() }),
      ...(input.effectiveFrom !== undefined && { effectiveFrom: input.effectiveFrom }),
      ...(input.effectiveTo !== undefined && { effectiveTo: input.effectiveTo }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return transformRateCard(rateCard) as RateCardWithDetails;
}

/**
 * Delete a rate card by ID
 */
export async function deleteRateCard(id: string): Promise<boolean> {
  try {
    await prisma.rateCard.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a rate card exists
 */
export async function rateCardExists(id: string): Promise<boolean> {
  const count = await prisma.rateCard.count({ where: { id } });
  return count > 0;
}

/**
 * Get rate card statistics
 */
export async function getRateCardStats(): Promise<{
  totalRateCards: number;
  activeRateCards: number;
  expiredRateCards: number;
  futureRateCards: number;
  vendorsWithRateCards: number;
  rolesWithRateCards: number;
  uniqueCurrencies: number;
}> {
  const now = new Date();

  const [
    total,
    active,
    expired,
    future,
    vendorsWithCards,
    rolesWithCards,
    currencies,
  ] = await Promise.all([
    prisma.rateCard.count(),
    prisma.rateCard.count({
      where: {
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
    }),
    prisma.rateCard.count({
      where: {
        effectiveTo: { lt: now },
      },
    }),
    prisma.rateCard.count({
      where: {
        effectiveFrom: { gt: now },
      },
    }),
    prisma.rateCard.findMany({
      distinct: ['vendorId'],
      select: { vendorId: true },
    }),
    prisma.rateCard.findMany({
      distinct: ['roleId'],
      select: { roleId: true },
    }),
    prisma.rateCard.findMany({
      distinct: ['currency'],
      select: { currency: true },
    }),
  ]);

  return {
    totalRateCards: total,
    activeRateCards: active,
    expiredRateCards: expired,
    futureRateCards: future,
    vendorsWithRateCards: vendorsWithCards.length,
    rolesWithRateCards: rolesWithCards.length,
    uniqueCurrencies: currencies.length,
  };
}

/**
 * Get unique currencies used in rate cards
 */
export async function getRateCardCurrencies(): Promise<string[]> {
  const currencies = await prisma.rateCard.findMany({
    distinct: ['currency'],
    select: { currency: true },
    orderBy: { currency: 'asc' },
  });

  return currencies.map((c) => c.currency);
}
