/**
 * Contract Service
 *
 * Manages contract CRUD operations with Zod validation.
 * Provides data access functions for the Contract model.
 * Includes expiration countdown tracking and status lifecycle management.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { Contract, ContractStatus, ContractAnalysis } from '@/types';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Zod schema for contract status
 */
export const contractStatusSchema = z.enum(['draft', 'active', 'expired', 'terminated']);

/**
 * Zod schema for creating a contract
 */
export const createContractSchema = z.object({
  vendorId: z
    .string()
    .min(1, 'Vendor is required'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters'),
  startDate: z
    .string()
    .min(1, 'Start date is required')
    .transform((val) => new Date(val)),
  endDate: z
    .string()
    .min(1, 'End date is required')
    .transform((val) => new Date(val)),
  value: z
    .coerce
    .number()
    .min(0, 'Value must be a positive number'),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .default('GBP'),
  status: contractStatusSchema.optional().default('draft'),
  documentUrl: z
    .string()
    .url('Document URL must be a valid URL')
    .optional()
    .nullable(),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  }
);

/**
 * Zod schema for updating a contract
 */
export const updateContractSchema = z.object({
  vendorId: z
    .string()
    .min(1, 'Vendor is required')
    .optional(),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters')
    .optional(),
  startDate: z
    .string()
    .min(1, 'Start date is required')
    .transform((val) => new Date(val))
    .optional(),
  endDate: z
    .string()
    .min(1, 'End date is required')
    .transform((val) => new Date(val))
    .optional(),
  value: z
    .coerce
    .number()
    .min(0, 'Value must be a positive number')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .optional(),
  status: contractStatusSchema.optional(),
  documentUrl: z
    .string()
    .url('Document URL must be a valid URL')
    .optional()
    .nullable(),
});

/**
 * Zod schema for contract ID parameter
 */
export const contractIdSchema = z.string().cuid('Invalid contract ID format');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input type for creating a contract
 */
export type CreateContractInput = z.infer<typeof createContractSchema>;

/**
 * Input type for updating a contract
 */
export type UpdateContractInput = z.infer<typeof updateContractSchema>;

/**
 * Contract with vendor from database
 */
export interface ContractWithVendor extends Omit<Contract, 'vendor'> {
  vendor: {
    id: string;
    name: string;
    status: string;
  };
  daysUntilExpiration?: number;
  expirationStatus?: 'expired' | 'expiring_soon' | 'active';
  // Document fields
  documentKey?: string;
  documentName?: string;
  documentSize?: number;
  documentType?: string;
  documentUploadedAt?: Date;
  // AI Analysis
  aiAnalysis?: ContractAnalysis;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate contract input using Zod schema
 * Returns a consistent validation result
 */
export function validateCreateContractInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: CreateContractInput;
} {
  const result = createContractSchema.safeParse(input);

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
 * Validate contract update input using Zod schema
 */
export function validateUpdateContractInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: UpdateContractInput;
} {
  const result = updateContractSchema.safeParse(input);

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
 * Validate contract ID
 */
export function validateContractId(id: unknown): {
  valid: boolean;
  errors: string[];
  data?: string;
} {
  const result = contractIdSchema.safeParse(id);

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
// EXPIRATION HELPERS
// ============================================================================

/**
 * Calculate days until contract expiration
 */
export function calculateDaysUntilExpiration(endDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get expiration status based on days remaining
 * - expired: contract has passed end date
 * - expiring_soon: contract expires within 30 days
 * - active: contract has more than 30 days remaining
 */
export function getExpirationStatus(
  endDate: Date,
  expirationThreshold: number = 30
): 'expired' | 'expiring_soon' | 'active' {
  const daysRemaining = calculateDaysUntilExpiration(endDate);

  if (daysRemaining < 0) {
    return 'expired';
  } else if (daysRemaining <= expirationThreshold) {
    return 'expiring_soon';
  }
  return 'active';
}

/**
 * Determine if contract status should be auto-updated based on dates
 */
export function getAutoStatus(
  currentStatus: ContractStatus,
  startDate: Date,
  endDate: Date
): ContractStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  // If terminated, keep it terminated
  if (currentStatus === 'terminated') {
    return 'terminated';
  }

  // If past end date, mark as expired
  if (today > end) {
    return 'expired';
  }

  // If active and within date range, keep active
  if (currentStatus === 'active') {
    return 'active';
  }

  // If draft, keep as draft (requires manual activation)
  return currentStatus;
}

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

/**
 * Transform database contract to API type with expiration info
 */
function transformContract(dbContract: {
  id: string;
  vendorId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  value: { toNumber: () => number } | number;
  currency: string;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  documentUrl: string | null;
  documentKey: string | null;
  documentName: string | null;
  documentSize: number | null;
  documentType: string | null;
  documentUploadedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  vendor: {
    id: string;
    name: string;
    status: string;
  };
  tags?: Array<{
    tag: {
      id: string;
      name: string;
      color: string | null;
    };
  }>;
  aiAnalysis?: {
    expirationDate: string | null;
    renewalTerms: string | null;
    sla: string | null;
    paymentTerms: string | null;
    noticePeriod: string | null;
    keyContacts: string | null;
    scopeSummary: string | null;
    terminationClauses: string | null;
    confidenceScores: unknown;
    analyzedAt: Date;
  } | null;
}): ContractWithVendor {
  const daysUntilExpiration = calculateDaysUntilExpiration(dbContract.endDate);
  const expirationStatus = getExpirationStatus(dbContract.endDate);

  return {
    id: dbContract.id,
    vendorId: dbContract.vendorId,
    title: dbContract.title,
    startDate: dbContract.startDate,
    endDate: dbContract.endDate,
    value: typeof dbContract.value === 'number'
      ? dbContract.value
      : dbContract.value.toNumber(),
    currency: dbContract.currency,
    status: dbContract.status as ContractStatus,
    documentUrl: dbContract.documentUrl ?? undefined,
    documentKey: dbContract.documentKey ?? undefined,
    documentName: dbContract.documentName ?? undefined,
    documentSize: dbContract.documentSize ?? undefined,
    documentType: dbContract.documentType ?? undefined,
    documentUploadedAt: dbContract.documentUploadedAt ?? undefined,
    createdAt: dbContract.createdAt,
    updatedAt: dbContract.updatedAt,
    vendor: dbContract.vendor,
    tags: dbContract.tags?.map((ct) => ({
      id: ct.tag.id,
      name: ct.tag.name,
      color: ct.tag.color ?? undefined,
      createdAt: dbContract.createdAt,
      updatedAt: dbContract.updatedAt,
    })) ?? [],
    daysUntilExpiration,
    expirationStatus,
    aiAnalysis: dbContract.aiAnalysis ? {
      expirationDate: dbContract.aiAnalysis.expirationDate || undefined,
      renewalTerms: dbContract.aiAnalysis.renewalTerms || undefined,
      sla: dbContract.aiAnalysis.sla || undefined,
      paymentTerms: dbContract.aiAnalysis.paymentTerms || undefined,
      noticePeriod: dbContract.aiAnalysis.noticePeriod || undefined,
      keyContacts: dbContract.aiAnalysis.keyContacts || undefined,
      scopeSummary: dbContract.aiAnalysis.scopeSummary || undefined,
      terminationClauses: dbContract.aiAnalysis.terminationClauses || undefined,
      confidenceScores: (dbContract.aiAnalysis.confidenceScores as Record<string, number>) || {},
      analyzedAt: dbContract.aiAnalysis.analyzedAt,
    } : undefined,
  };
}

// ============================================================================
// DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all contracts from the database
 */
export async function getAllContracts(): Promise<ContractWithVendor[]> {
  const contracts = await prisma.contract.findMany({
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      aiAnalysis: true,
    },
    orderBy: [{ endDate: 'asc' }],
  });

  return contracts.map(transformContract);
}

/**
 * Get contracts with optional filtering
 */
export async function getContracts(options?: {
  status?: ContractStatus;
  vendorId?: string;
  search?: string;
  expiringWithinDays?: number;
  limit?: number;
  offset?: number;
}): Promise<{ contracts: ContractWithVendor[]; total: number }> {
  const where: {
    status?: ContractStatus;
    vendorId?: string;
    endDate?: { lte: Date };
    OR?: Array<{ title: { contains: string; mode: 'insensitive' } } | { vendor: { name: { contains: string; mode: 'insensitive' } } }>;
  } = {};

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.vendorId) {
    where.vendorId = options.vendorId;
  }

  if (options?.search) {
    where.OR = [
      { title: { contains: options.search, mode: 'insensitive' } },
      { vendor: { name: { contains: options.search, mode: 'insensitive' } } },
    ];
  }

  if (options?.expiringWithinDays) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + options.expiringWithinDays);
    where.endDate = { lte: futureDate };
  }

  const [contracts, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        aiAnalysis: true,
      },
      orderBy: [{ endDate: 'asc' }],
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.contract.count({ where }),
  ]);

  return {
    contracts: contracts.map(transformContract),
    total,
  };
}

/**
 * Get a contract by ID
 */
export async function getContractById(id: string): Promise<ContractWithVendor | null> {
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      aiAnalysis: true,
    },
  });

  return contract ? transformContract(contract) : null;
}

/**
 * Create a new contract
 */
export async function createContract(input: CreateContractInput): Promise<ContractWithVendor> {
  const contract = await prisma.contract.create({
    data: {
      vendorId: input.vendorId,
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      value: input.value,
      currency: input.currency,
      status: input.status ?? 'draft',
      documentUrl: input.documentUrl ?? null,
    },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      aiAnalysis: true,
    },
  });

  return transformContract(contract);
}

/**
 * Update an existing contract
 */
export async function updateContract(
  id: string,
  input: UpdateContractInput
): Promise<ContractWithVendor | null> {
  // Check if contract exists
  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const contract = await prisma.contract.update({
    where: { id },
    data: {
      ...(input.vendorId !== undefined && { vendorId: input.vendorId }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.value !== undefined && { value: input.value }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.documentUrl !== undefined && { documentUrl: input.documentUrl }),
    },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      aiAnalysis: true,
    },
  });

  return transformContract(contract);
}

/**
 * Delete a contract by ID
 */
export async function deleteContract(id: string): Promise<boolean> {
  try {
    await prisma.contract.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a contract exists
 */
export async function contractExists(id: string): Promise<boolean> {
  const count = await prisma.contract.count({ where: { id } });
  return count > 0;
}

/**
 * Update contract status (for status lifecycle management)
 */
export async function updateContractStatus(
  id: string,
  status: ContractStatus
): Promise<ContractWithVendor | null> {
  return updateContract(id, { status });
}

/**
 * Activate a contract (change from draft to active)
 */
export async function activateContract(id: string): Promise<ContractWithVendor | null> {
  const contract = await prisma.contract.findUnique({ where: { id } });

  if (!contract) {
    return null;
  }

  if (contract.status !== 'draft') {
    throw new Error('Only draft contracts can be activated');
  }

  return updateContractStatus(id, 'active');
}

/**
 * Terminate a contract
 */
export async function terminateContract(id: string): Promise<ContractWithVendor | null> {
  const contract = await prisma.contract.findUnique({ where: { id } });

  if (!contract) {
    return null;
  }

  if (contract.status === 'terminated') {
    throw new Error('Contract is already terminated');
  }

  return updateContractStatus(id, 'terminated');
}

/**
 * Get contract statistics
 */
export async function getContractStats(): Promise<{
  totalContracts: number;
  draftContracts: number;
  activeContracts: number;
  expiredContracts: number;
  terminatedContracts: number;
  expiringWithin30Days: number;
  totalValue: number;
}> {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    total,
    draft,
    active,
    expired,
    terminated,
    expiringSoon,
    activeContracts,
  ] = await Promise.all([
    prisma.contract.count(),
    prisma.contract.count({ where: { status: 'draft' } }),
    prisma.contract.count({ where: { status: 'active' } }),
    prisma.contract.count({ where: { status: 'expired' } }),
    prisma.contract.count({ where: { status: 'terminated' } }),
    prisma.contract.count({
      where: {
        status: 'active',
        endDate: {
          gte: today,
          lte: thirtyDaysFromNow,
        },
      },
    }),
    prisma.contract.findMany({
      where: { status: 'active' },
      select: { value: true },
    }),
  ]);

  const totalValue = activeContracts.reduce(
    (sum, contract) => sum + (typeof contract.value === 'number' ? contract.value : contract.value.toNumber()),
    0
  );

  return {
    totalContracts: total,
    draftContracts: draft,
    activeContracts: active,
    expiredContracts: expired,
    terminatedContracts: terminated,
    expiringWithin30Days: expiringSoon,
    totalValue,
  };
}

/**
 * Get contracts expiring soon (within specified days)
 */
export async function getExpiringContracts(
  days: number = 30
): Promise<ContractWithVendor[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const contracts = await prisma.contract.findMany({
    where: {
      status: 'active',
      endDate: {
        gte: today,
        lte: futureDate,
      },
    },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      aiAnalysis: true,
    },
    orderBy: [{ endDate: 'asc' }],
  });

  return contracts.map(transformContract);
}

/**
 * Auto-update expired contracts (utility function for background jobs)
 */
export async function autoUpdateExpiredContracts(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await prisma.contract.updateMany({
    where: {
      status: 'active',
      endDate: {
        lt: today,
      },
    },
    data: {
      status: 'expired',
    },
  });

  return result.count;
}
