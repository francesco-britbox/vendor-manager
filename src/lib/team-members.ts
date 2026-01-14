/**
 * Team Member Service
 *
 * Manages team member CRUD operations with Zod validation.
 * Provides data access functions for the TeamMember model.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { TeamMember, TeamMemberStatus } from '@/types';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Zod schema for team member status
 */
export const teamMemberStatusSchema = z.enum(['active', 'inactive', 'onboarding', 'offboarded']);

/**
 * Zod schema for creating a team member
 */
export const createTeamMemberSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(255, 'First name must be at most 255 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(255, 'Last name must be at most 255 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be at most 255 characters'),
  vendorId: z.string().cuid('Invalid vendor ID format'),
  roleId: z.string().cuid('Invalid role ID format'),
  dailyRate: z
    .number()
    .positive('Daily rate must be positive')
    .max(999999999999, 'Daily rate is too large'),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .default('GBP'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  status: teamMemberStatusSchema.optional().default('active'),
  plannedUtilization: z
    .number()
    .min(0, 'Utilization must be at least 0')
    .max(100, 'Utilization must be at most 100')
    .optional()
    .nullable(),
});

/**
 * Zod schema for updating a team member
 */
export const updateTeamMemberSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(255, 'First name must be at most 255 characters')
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(255, 'Last name must be at most 255 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be at most 255 characters')
    .optional(),
  vendorId: z.string().cuid('Invalid vendor ID format').optional(),
  roleId: z.string().cuid('Invalid role ID format').optional(),
  dailyRate: z
    .number()
    .positive('Daily rate must be positive')
    .max(999999999999, 'Daily rate is too large')
    .optional(),
  currency: z
    .string()
    .length(3, 'Currency must be a 3-letter code')
    .optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional().nullable(),
  status: teamMemberStatusSchema.optional(),
  plannedUtilization: z
    .number()
    .min(0, 'Utilization must be at least 0')
    .max(100, 'Utilization must be at most 100')
    .optional()
    .nullable(),
});

/**
 * Zod schema for team member ID parameter
 */
export const teamMemberIdSchema = z.string().cuid('Invalid team member ID format');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input type for creating a team member
 */
export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;

/**
 * Input type for updating a team member
 */
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;

/**
 * Team member with relations from database
 */
export interface TeamMemberWithRelations extends Omit<TeamMember, 'tags'> {
  vendor: {
    id: string;
    name: string;
  };
  role: {
    id: string;
    name: string;
  };
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
 * Validate team member input using Zod schema
 * Returns a consistent validation result
 */
export function validateCreateTeamMemberInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: CreateTeamMemberInput;
} {
  const result = createTeamMemberSchema.safeParse(input);

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
 * Validate team member update input using Zod schema
 */
export function validateUpdateTeamMemberInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: UpdateTeamMemberInput;
} {
  const result = updateTeamMemberSchema.safeParse(input);

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
 * Validate team member ID
 */
export function validateTeamMemberId(id: unknown): {
  valid: boolean;
  errors: string[];
  data?: string;
} {
  const result = teamMemberIdSchema.safeParse(id);

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
 * Transform database team member to API type
 */
function transformTeamMember(dbTeamMember: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  vendorId: string;
  roleId: string;
  dailyRate: { toNumber: () => number } | number;
  currency: string;
  startDate: Date;
  endDate: Date | null;
  status: 'active' | 'inactive' | 'onboarding' | 'offboarded';
  plannedUtilization: { toNumber: () => number } | number | null;
  createdAt: Date;
  updatedAt: Date;
  vendor?: {
    id: string;
    name: string;
  };
  role?: {
    id: string;
    name: string;
  };
  tags?: Array<{
    tag: {
      id: string;
      name: string;
      color: string | null;
    };
  }>;
}): TeamMember & { vendor?: { id: string; name: string }; role?: { id: string; name: string } } {
  const dailyRate = typeof dbTeamMember.dailyRate === 'object' && 'toNumber' in dbTeamMember.dailyRate
    ? dbTeamMember.dailyRate.toNumber()
    : dbTeamMember.dailyRate as number;

  const plannedUtilization = dbTeamMember.plannedUtilization
    ? (typeof dbTeamMember.plannedUtilization === 'object' && 'toNumber' in dbTeamMember.plannedUtilization
      ? dbTeamMember.plannedUtilization.toNumber()
      : dbTeamMember.plannedUtilization as number)
    : undefined;

  return {
    id: dbTeamMember.id,
    firstName: dbTeamMember.firstName,
    lastName: dbTeamMember.lastName,
    email: dbTeamMember.email,
    vendorId: dbTeamMember.vendorId,
    roleId: dbTeamMember.roleId,
    dailyRate,
    currency: dbTeamMember.currency,
    startDate: dbTeamMember.startDate,
    endDate: dbTeamMember.endDate ?? undefined,
    status: dbTeamMember.status as TeamMemberStatus,
    plannedUtilization,
    createdAt: dbTeamMember.createdAt,
    updatedAt: dbTeamMember.updatedAt,
    tags: dbTeamMember.tags?.map((tm) => ({
      id: tm.tag.id,
      name: tm.tag.name,
      color: tm.tag.color ?? undefined,
      createdAt: dbTeamMember.createdAt,
      updatedAt: dbTeamMember.updatedAt,
    })) ?? [],
    ...(dbTeamMember.vendor && { vendor: dbTeamMember.vendor }),
    ...(dbTeamMember.role && { role: dbTeamMember.role }),
  };
}

// ============================================================================
// DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all team members from the database
 */
export async function getAllTeamMembers(): Promise<(TeamMember & { vendor?: { id: string; name: string }; role?: { id: string; name: string } })[]> {
  const teamMembers = await prisma.teamMember.findMany({
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  return teamMembers.map(transformTeamMember);
}

/**
 * Get team members with optional filtering
 */
export async function getTeamMembers(options?: {
  status?: TeamMemberStatus;
  vendorId?: string;
  roleId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ teamMembers: (TeamMember & { vendor?: { id: string; name: string }; role?: { id: string; name: string } })[]; total: number }> {
  const where: {
    status?: 'active' | 'inactive' | 'onboarding' | 'offboarded';
    vendorId?: string;
    roleId?: string;
    OR?: Array<
      | { firstName: { contains: string; mode: 'insensitive' } }
      | { lastName: { contains: string; mode: 'insensitive' } }
      | { email: { contains: string; mode: 'insensitive' } }
    >;
  } = {};

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.vendorId) {
    where.vendorId = options.vendorId;
  }

  if (options?.roleId) {
    where.roleId = options.roleId;
  }

  if (options?.search) {
    where.OR = [
      { firstName: { contains: options.search, mode: 'insensitive' } },
      { lastName: { contains: options.search, mode: 'insensitive' } },
      { email: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [teamMembers, total] = await Promise.all([
    prisma.teamMember.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.teamMember.count({ where }),
  ]);

  return {
    teamMembers: teamMembers.map(transformTeamMember),
    total,
  };
}

/**
 * Get a team member by ID
 */
export async function getTeamMemberById(id: string): Promise<(TeamMember & { vendor?: { id: string; name: string }; role?: { id: string; name: string } }) | null> {
  const teamMember = await prisma.teamMember.findUnique({
    where: { id },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return teamMember ? transformTeamMember(teamMember) : null;
}

/**
 * Create a new team member
 */
export async function createTeamMember(input: CreateTeamMemberInput): Promise<TeamMember & { vendor?: { id: string; name: string }; role?: { id: string; name: string } }> {
  // Verify vendor exists
  const vendor = await prisma.vendor.findUnique({
    where: { id: input.vendorId },
  });
  if (!vendor) {
    throw new Error('Vendor not found');
  }

  // Verify role exists
  const role = await prisma.role.findUnique({
    where: { id: input.roleId },
  });
  if (!role) {
    throw new Error('Role not found');
  }

  // Check for duplicate email
  const existingMember = await prisma.teamMember.findUnique({
    where: { email: input.email },
  });
  if (existingMember) {
    throw new Error('A team member with this email already exists');
  }

  const teamMember = await prisma.teamMember.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      vendorId: input.vendorId,
      roleId: input.roleId,
      dailyRate: input.dailyRate,
      currency: input.currency ?? 'GBP',
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      status: input.status ?? 'active',
      plannedUtilization: input.plannedUtilization ?? null,
    },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return transformTeamMember(teamMember);
}

/**
 * Update an existing team member
 */
export async function updateTeamMember(
  id: string,
  input: UpdateTeamMemberInput
): Promise<(TeamMember & { vendor?: { id: string; name: string }; role?: { id: string; name: string } }) | null> {
  // Check if team member exists
  const existing = await prisma.teamMember.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  // Verify vendor exists if updating
  if (input.vendorId) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: input.vendorId },
    });
    if (!vendor) {
      throw new Error('Vendor not found');
    }
  }

  // Verify role exists if updating
  if (input.roleId) {
    const role = await prisma.role.findUnique({
      where: { id: input.roleId },
    });
    if (!role) {
      throw new Error('Role not found');
    }
  }

  // Check for duplicate email if updating
  if (input.email && input.email !== existing.email) {
    const existingMember = await prisma.teamMember.findUnique({
      where: { email: input.email },
    });
    if (existingMember) {
      throw new Error('A team member with this email already exists');
    }
  }

  const teamMember = await prisma.teamMember.update({
    where: { id },
    data: {
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.vendorId !== undefined && { vendorId: input.vendorId }),
      ...(input.roleId !== undefined && { roleId: input.roleId }),
      ...(input.dailyRate !== undefined && { dailyRate: input.dailyRate }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.plannedUtilization !== undefined && { plannedUtilization: input.plannedUtilization }),
    },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return transformTeamMember(teamMember);
}

/**
 * Delete a team member by ID
 */
export async function deleteTeamMember(id: string): Promise<boolean> {
  try {
    await prisma.teamMember.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a team member exists
 */
export async function teamMemberExists(id: string): Promise<boolean> {
  const count = await prisma.teamMember.count({ where: { id } });
  return count > 0;
}

/**
 * Get team member statistics
 */
export async function getTeamMemberStats(): Promise<{
  totalTeamMembers: number;
  activeTeamMembers: number;
  inactiveTeamMembers: number;
  onboardingTeamMembers: number;
  offboardedTeamMembers: number;
}> {
  const [total, active, inactive, onboarding, offboarded] = await Promise.all([
    prisma.teamMember.count(),
    prisma.teamMember.count({ where: { status: 'active' } }),
    prisma.teamMember.count({ where: { status: 'inactive' } }),
    prisma.teamMember.count({ where: { status: 'onboarding' } }),
    prisma.teamMember.count({ where: { status: 'offboarded' } }),
  ]);

  return {
    totalTeamMembers: total,
    activeTeamMembers: active,
    inactiveTeamMembers: inactive,
    onboardingTeamMembers: onboarding,
    offboardedTeamMembers: offboarded,
  };
}
