/**
 * Invoice Service
 *
 * Manages invoice CRUD operations with Zod validation.
 * Provides data access functions for the Invoice model.
 * Includes validation engine comparing invoice amounts against calculated timesheet spend.
 * Supports configurable tolerance thresholds and discrepancy highlighting.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Decimal } from 'decimal.js';
import type { Invoice, InvoiceStatus, Tag } from '@/types';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Zod schema for invoice status
 */
export const invoiceStatusSchema = z.enum(['pending', 'validated', 'disputed', 'paid']);

/**
 * Zod schema for creating an invoice
 */
export const createInvoiceSchema = z.object({
  vendorId: z
    .string()
    .min(1, 'Vendor is required'),
  invoiceNumber: z
    .string()
    .min(1, 'Invoice number is required')
    .max(100, 'Invoice number must be at most 100 characters'),
  invoiceDate: z
    .string()
    .min(1, 'Invoice date is required')
    .transform((val) => new Date(val)),
  billingPeriodStart: z
    .string()
    .min(1, 'Billing period start is required')
    .transform((val) => new Date(val)),
  billingPeriodEnd: z
    .string()
    .min(1, 'Billing period end is required')
    .transform((val) => new Date(val)),
  amount: z
    .coerce
    .number()
    .min(0, 'Amount must be a positive number'),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .default('GBP'),
  status: invoiceStatusSchema.optional().default('pending'),
  toleranceThreshold: z
    .coerce
    .number()
    .min(0, 'Tolerance threshold must be a positive number')
    .max(100, 'Tolerance threshold cannot exceed 100%')
    .optional()
    .default(5), // Default 5% tolerance
}).refine(
  (data) => data.billingPeriodEnd >= data.billingPeriodStart,
  {
    message: 'Billing period end must be after or equal to billing period start',
    path: ['billingPeriodEnd'],
  }
);

/**
 * Zod schema for updating an invoice
 */
export const updateInvoiceSchema = z.object({
  vendorId: z
    .string()
    .min(1, 'Vendor is required')
    .optional(),
  invoiceNumber: z
    .string()
    .min(1, 'Invoice number is required')
    .max(100, 'Invoice number must be at most 100 characters')
    .optional(),
  invoiceDate: z
    .string()
    .min(1, 'Invoice date is required')
    .transform((val) => new Date(val))
    .optional(),
  billingPeriodStart: z
    .string()
    .min(1, 'Billing period start is required')
    .transform((val) => new Date(val))
    .optional(),
  billingPeriodEnd: z
    .string()
    .min(1, 'Billing period end is required')
    .transform((val) => new Date(val))
    .optional(),
  amount: z
    .coerce
    .number()
    .min(0, 'Amount must be a positive number')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .optional(),
  status: invoiceStatusSchema.optional(),
  toleranceThreshold: z
    .coerce
    .number()
    .min(0, 'Tolerance threshold must be a positive number')
    .max(100, 'Tolerance threshold cannot exceed 100%')
    .optional(),
});

/**
 * Zod schema for invoice ID parameter
 */
export const invoiceIdSchema = z.string().cuid('Invalid invoice ID format');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input type for creating an invoice
 */
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/**
 * Input type for updating an invoice
 */
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

/**
 * Invoice with vendor details
 */
export interface InvoiceWithVendor extends Omit<Invoice, 'vendor'> {
  vendor: {
    id: string;
    name: string;
    status: string;
  };
  // Validation fields
  validationStatus?: 'within_tolerance' | 'exceeds_tolerance' | 'not_validated';
  discrepancyPercentage?: number;
}

/**
 * Validation result for an invoice
 */
export interface InvoiceValidationResult {
  invoiceId: string;
  invoiceAmount: number;
  expectedAmount: number;
  discrepancy: number;
  discrepancyPercentage: number;
  toleranceThreshold: number;
  isWithinTolerance: boolean;
  validationDetails: TeamMemberSpendBreakdown[];
}

/**
 * Team member spend breakdown
 */
export interface TeamMemberSpendBreakdown {
  teamMemberId: string;
  teamMemberName: string;
  totalHours: number;
  dailyRate: number;
  currency: string;
  totalSpend: number;
}

/**
 * Invoice statistics
 */
export interface InvoiceStats {
  totalInvoices: number;
  pendingInvoices: number;
  validatedInvoices: number;
  disputedInvoices: number;
  paidInvoices: number;
  totalAmount: number;
  totalExpectedAmount: number;
  invoicesExceedingTolerance: number;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate invoice input using Zod schema
 */
export function validateCreateInvoiceInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: CreateInvoiceInput;
} {
  const result = createInvoiceSchema.safeParse(input);

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
 * Validate invoice update input using Zod schema
 */
export function validateUpdateInvoiceInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: UpdateInvoiceInput;
} {
  const result = updateInvoiceSchema.safeParse(input);

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
 * Validate invoice ID
 */
export function validateInvoiceId(id: unknown): {
  valid: boolean;
  errors: string[];
  data?: string;
} {
  const result = invoiceIdSchema.safeParse(id);

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
 * Transform database invoice to API type
 */
function transformInvoice(dbInvoice: {
  id: string;
  vendorId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  amount: { toNumber: () => number } | number;
  currency: string;
  status: 'pending' | 'validated' | 'disputed' | 'paid';
  expectedAmount: { toNumber: () => number } | number | null;
  discrepancy: { toNumber: () => number } | number | null;
  toleranceThreshold: { toNumber: () => number } | number | null;
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
}): InvoiceWithVendor {
  const amount = typeof dbInvoice.amount === 'number'
    ? dbInvoice.amount
    : dbInvoice.amount.toNumber();

  const expectedAmount = dbInvoice.expectedAmount
    ? (typeof dbInvoice.expectedAmount === 'number'
      ? dbInvoice.expectedAmount
      : dbInvoice.expectedAmount.toNumber())
    : undefined;

  const discrepancy = dbInvoice.discrepancy
    ? (typeof dbInvoice.discrepancy === 'number'
      ? dbInvoice.discrepancy
      : dbInvoice.discrepancy.toNumber())
    : undefined;

  const toleranceThreshold = dbInvoice.toleranceThreshold
    ? (typeof dbInvoice.toleranceThreshold === 'number'
      ? dbInvoice.toleranceThreshold
      : dbInvoice.toleranceThreshold.toNumber())
    : undefined;

  // Calculate validation status
  let validationStatus: 'within_tolerance' | 'exceeds_tolerance' | 'not_validated' = 'not_validated';
  let discrepancyPercentage: number | undefined;

  if (expectedAmount !== undefined && toleranceThreshold !== undefined) {
    discrepancyPercentage = expectedAmount > 0
      ? Math.abs((amount - expectedAmount) / expectedAmount) * 100
      : 0;

    validationStatus = discrepancyPercentage <= toleranceThreshold
      ? 'within_tolerance'
      : 'exceeds_tolerance';
  }

  return {
    id: dbInvoice.id,
    vendorId: dbInvoice.vendorId,
    invoiceNumber: dbInvoice.invoiceNumber,
    invoiceDate: dbInvoice.invoiceDate,
    billingPeriodStart: dbInvoice.billingPeriodStart,
    billingPeriodEnd: dbInvoice.billingPeriodEnd,
    amount,
    currency: dbInvoice.currency,
    status: dbInvoice.status as InvoiceStatus,
    expectedAmount,
    discrepancy,
    toleranceThreshold,
    createdAt: dbInvoice.createdAt,
    updatedAt: dbInvoice.updatedAt,
    vendor: dbInvoice.vendor,
    tags: dbInvoice.tags?.map((it) => ({
      id: it.tag.id,
      name: it.tag.name,
      color: it.tag.color ?? undefined,
      createdAt: dbInvoice.createdAt,
      updatedAt: dbInvoice.updatedAt,
    })) ?? [],
    validationStatus,
    discrepancyPercentage,
  };
}

// ============================================================================
// TIMESHEET SPEND CALCULATION
// ============================================================================

/**
 * Calculate expected spend from timesheets for a vendor in a billing period
 */
export async function calculateExpectedSpend(
  vendorId: string,
  billingPeriodStart: Date,
  billingPeriodEnd: Date
): Promise<{
  totalExpectedSpend: number;
  breakdown: TeamMemberSpendBreakdown[];
}> {
  // Get all team members for this vendor
  const teamMembers = await prisma.teamMember.findMany({
    where: {
      vendorId,
      status: 'active',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dailyRate: true,
      currency: true,
    },
  });

  if (teamMembers.length === 0) {
    return { totalExpectedSpend: 0, breakdown: [] };
  }

  // Get all timesheet entries for these team members in the billing period
  const entries = await prisma.timesheetEntry.findMany({
    where: {
      teamMemberId: { in: teamMembers.map((t) => t.id) },
      date: {
        gte: billingPeriodStart,
        lte: billingPeriodEnd,
      },
    },
  });

  // Group entries by team member
  const entriesByMember = new Map<string, typeof entries>();
  for (const entry of entries) {
    const memberEntries = entriesByMember.get(entry.teamMemberId) || [];
    memberEntries.push(entry);
    entriesByMember.set(entry.teamMemberId, memberEntries);
  }

  // Calculate spend per team member
  const breakdown: TeamMemberSpendBreakdown[] = [];
  let totalExpectedSpend = new Decimal(0);

  for (const member of teamMembers) {
    const memberEntries = entriesByMember.get(member.id) || [];
    const dailyRate = typeof member.dailyRate === 'object' && 'toNumber' in member.dailyRate
      ? (member.dailyRate as { toNumber: () => number }).toNumber()
      : member.dailyRate as number;

    let totalHours = new Decimal(0);

    for (const entry of memberEntries) {
      if (entry.hours) {
        const hours = typeof entry.hours === 'object' && 'toNumber' in entry.hours
          ? entry.hours.toNumber()
          : entry.hours as number;
        totalHours = totalHours.plus(hours);
      }
      // Time-off codes are not billable
    }

    // Calculate spend (hours / 8 * daily rate)
    const memberSpend = totalHours.dividedBy(8).times(dailyRate);
    totalExpectedSpend = totalExpectedSpend.plus(memberSpend);

    if (totalHours.greaterThan(0)) {
      breakdown.push({
        teamMemberId: member.id,
        teamMemberName: `${member.firstName} ${member.lastName}`,
        totalHours: totalHours.toNumber(),
        dailyRate,
        currency: member.currency,
        totalSpend: Math.round(memberSpend.toNumber() * 100) / 100,
      });
    }
  }

  return {
    totalExpectedSpend: Math.round(totalExpectedSpend.toNumber() * 100) / 100,
    breakdown,
  };
}

/**
 * Validate an invoice against timesheet spend
 */
export async function validateInvoiceAgainstTimesheet(
  invoiceId: string
): Promise<InvoiceValidationResult | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    return null;
  }

  const { totalExpectedSpend, breakdown } = await calculateExpectedSpend(
    invoice.vendorId,
    invoice.billingPeriodStart,
    invoice.billingPeriodEnd
  );

  const invoiceAmount = typeof invoice.amount === 'number'
    ? invoice.amount
    : invoice.amount.toNumber();

  const toleranceThreshold = invoice.toleranceThreshold
    ? (typeof invoice.toleranceThreshold === 'number'
      ? invoice.toleranceThreshold
      : invoice.toleranceThreshold.toNumber())
    : 5; // Default 5%

  const discrepancy = invoiceAmount - totalExpectedSpend;
  const discrepancyPercentage = totalExpectedSpend > 0
    ? Math.abs(discrepancy / totalExpectedSpend) * 100
    : (invoiceAmount > 0 ? 100 : 0);

  const isWithinTolerance = discrepancyPercentage <= toleranceThreshold;

  // Update the invoice with validation results
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      expectedAmount: totalExpectedSpend,
      discrepancy,
      toleranceThreshold,
    },
  });

  return {
    invoiceId,
    invoiceAmount,
    expectedAmount: totalExpectedSpend,
    discrepancy: Math.round(discrepancy * 100) / 100,
    discrepancyPercentage: Math.round(discrepancyPercentage * 100) / 100,
    toleranceThreshold,
    isWithinTolerance,
    validationDetails: breakdown,
  };
}

// ============================================================================
// DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all invoices from the database
 */
export async function getAllInvoices(): Promise<InvoiceWithVendor[]> {
  const invoices = await prisma.invoice.findMany({
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
    },
    orderBy: [{ invoiceDate: 'desc' }],
  });

  return invoices.map(transformInvoice);
}

/**
 * Get invoices with optional filtering
 */
export async function getInvoices(options?: {
  status?: InvoiceStatus;
  vendorId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ invoices: InvoiceWithVendor[]; total: number }> {
  const where: {
    status?: InvoiceStatus;
    vendorId?: string;
    invoiceDate?: { gte?: Date; lte?: Date };
    OR?: Array<{ invoiceNumber: { contains: string; mode: 'insensitive' } } | { vendor: { name: { contains: string; mode: 'insensitive' } } }>;
  } = {};

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.vendorId) {
    where.vendorId = options.vendorId;
  }

  if (options?.search) {
    where.OR = [
      { invoiceNumber: { contains: options.search, mode: 'insensitive' } },
      { vendor: { name: { contains: options.search, mode: 'insensitive' } } },
    ];
  }

  if (options?.dateFrom || options?.dateTo) {
    where.invoiceDate = {};
    if (options?.dateFrom) {
      where.invoiceDate.gte = options.dateFrom;
    }
    if (options?.dateTo) {
      where.invoiceDate.lte = options.dateTo;
    }
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
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
      },
      orderBy: [{ invoiceDate: 'desc' }],
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    invoices: invoices.map(transformInvoice),
    total,
  };
}

/**
 * Get an invoice by ID
 */
export async function getInvoiceById(id: string): Promise<InvoiceWithVendor | null> {
  const invoice = await prisma.invoice.findUnique({
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
    },
  });

  return invoice ? transformInvoice(invoice) : null;
}

/**
 * Create a new invoice
 */
export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceWithVendor> {
  // Check for duplicate invoice number
  const existing = await prisma.invoice.findUnique({
    where: { invoiceNumber: input.invoiceNumber },
  });

  if (existing) {
    throw new Error(`Invoice with number "${input.invoiceNumber}" already exists`);
  }

  // Verify vendor exists
  const vendor = await prisma.vendor.findUnique({
    where: { id: input.vendorId },
  });

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  const invoice = await prisma.invoice.create({
    data: {
      vendorId: input.vendorId,
      invoiceNumber: input.invoiceNumber,
      invoiceDate: input.invoiceDate,
      billingPeriodStart: input.billingPeriodStart,
      billingPeriodEnd: input.billingPeriodEnd,
      amount: input.amount,
      currency: input.currency,
      status: input.status ?? 'pending',
      toleranceThreshold: input.toleranceThreshold ?? 5,
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
    },
  });

  return transformInvoice(invoice);
}

/**
 * Update an existing invoice
 */
export async function updateInvoice(
  id: string,
  input: UpdateInvoiceInput
): Promise<InvoiceWithVendor | null> {
  // Check if invoice exists
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  // Check for duplicate invoice number if it's being changed
  if (input.invoiceNumber && input.invoiceNumber !== existing.invoiceNumber) {
    const duplicate = await prisma.invoice.findUnique({
      where: { invoiceNumber: input.invoiceNumber },
    });
    if (duplicate) {
      throw new Error(`Invoice with number "${input.invoiceNumber}" already exists`);
    }
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...(input.vendorId !== undefined && { vendorId: input.vendorId }),
      ...(input.invoiceNumber !== undefined && { invoiceNumber: input.invoiceNumber }),
      ...(input.invoiceDate !== undefined && { invoiceDate: input.invoiceDate }),
      ...(input.billingPeriodStart !== undefined && { billingPeriodStart: input.billingPeriodStart }),
      ...(input.billingPeriodEnd !== undefined && { billingPeriodEnd: input.billingPeriodEnd }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.toleranceThreshold !== undefined && { toleranceThreshold: input.toleranceThreshold }),
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
    },
  });

  return transformInvoice(invoice);
}

/**
 * Delete an invoice by ID
 */
export async function deleteInvoice(id: string): Promise<boolean> {
  try {
    await prisma.invoice.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if an invoice exists
 */
export async function invoiceExists(id: string): Promise<boolean> {
  const count = await prisma.invoice.count({ where: { id } });
  return count > 0;
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<InvoiceWithVendor | null> {
  return updateInvoice(id, { status });
}

/**
 * Get invoice statistics
 */
export async function getInvoiceStats(): Promise<InvoiceStats> {
  const [
    total,
    pending,
    validated,
    disputed,
    paid,
    invoices,
  ] = await Promise.all([
    prisma.invoice.count(),
    prisma.invoice.count({ where: { status: 'pending' } }),
    prisma.invoice.count({ where: { status: 'validated' } }),
    prisma.invoice.count({ where: { status: 'disputed' } }),
    prisma.invoice.count({ where: { status: 'paid' } }),
    prisma.invoice.findMany({
      select: {
        amount: true,
        expectedAmount: true,
        discrepancy: true,
        toleranceThreshold: true,
      },
    }),
  ]);

  let totalAmount = new Decimal(0);
  let totalExpectedAmount = new Decimal(0);
  let invoicesExceedingTolerance = 0;

  for (const invoice of invoices) {
    const amount = typeof invoice.amount === 'number'
      ? invoice.amount
      : invoice.amount.toNumber();
    totalAmount = totalAmount.plus(amount);

    if (invoice.expectedAmount) {
      const expected = typeof invoice.expectedAmount === 'number'
        ? invoice.expectedAmount
        : invoice.expectedAmount.toNumber();
      totalExpectedAmount = totalExpectedAmount.plus(expected);

      const tolerance = invoice.toleranceThreshold
        ? (typeof invoice.toleranceThreshold === 'number'
          ? invoice.toleranceThreshold
          : invoice.toleranceThreshold.toNumber())
        : 5;

      const discrepancyPercent = expected > 0
        ? Math.abs((amount - expected) / expected) * 100
        : 0;

      if (discrepancyPercent > tolerance) {
        invoicesExceedingTolerance++;
      }
    }
  }

  return {
    totalInvoices: total,
    pendingInvoices: pending,
    validatedInvoices: validated,
    disputedInvoices: disputed,
    paidInvoices: paid,
    totalAmount: Math.round(totalAmount.toNumber() * 100) / 100,
    totalExpectedAmount: Math.round(totalExpectedAmount.toNumber() * 100) / 100,
    invoicesExceedingTolerance,
  };
}

/**
 * Get invoices that exceed their tolerance threshold
 */
export async function getInvoicesExceedingTolerance(): Promise<InvoiceWithVendor[]> {
  const allInvoices = await getAllInvoices();

  return allInvoices.filter(
    (invoice) => invoice.validationStatus === 'exceeds_tolerance'
  );
}

/**
 * Batch validate multiple invoices
 */
export async function batchValidateInvoices(
  invoiceIds: string[]
): Promise<InvoiceValidationResult[]> {
  const results: InvoiceValidationResult[] = [];

  for (const id of invoiceIds) {
    const result = await validateInvoiceAgainstTimesheet(id);
    if (result) {
      results.push(result);
    }
  }

  return results;
}
