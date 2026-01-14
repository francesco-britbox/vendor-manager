/**
 * Role Service
 *
 * Manages role CRUD operations with Zod validation.
 * Provides data access functions for the Role model.
 * Roles can be assigned to team members and linked to rate cards.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import type { Role } from '@/types';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Zod schema for creating a role
 */
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  description: z
    .string()
    .max(5000, 'Description must be at most 5000 characters')
    .optional()
    .nullable(),
});

/**
 * Zod schema for updating a role
 */
export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters')
    .optional(),
  description: z
    .string()
    .max(5000, 'Description must be at most 5000 characters')
    .optional()
    .nullable(),
});

/**
 * Zod schema for role ID parameter
 */
export const roleIdSchema = z.string().cuid('Invalid role ID format');

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input type for creating a role
 */
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

/**
 * Input type for updating a role
 */
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

/**
 * Role with usage counts
 */
export interface RoleWithUsage extends Role {
  teamMemberCount: number;
  rateCardCount: number;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate role input using Zod schema
 * Returns a consistent validation result
 */
export function validateCreateRoleInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: CreateRoleInput;
} {
  const result = createRoleSchema.safeParse(input);

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
 * Validate role update input using Zod schema
 */
export function validateUpdateRoleInput(input: unknown): {
  valid: boolean;
  errors: string[];
  data?: UpdateRoleInput;
} {
  const result = updateRoleSchema.safeParse(input);

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
 * Validate role ID
 */
export function validateRoleId(id: unknown): {
  valid: boolean;
  errors: string[];
  data?: string;
} {
  const result = roleIdSchema.safeParse(id);

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
 * Transform database role to API type
 */
function transformRole(dbRole: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    teamMembers: number;
    rateCards: number;
  };
}): Role | RoleWithUsage {
  const base: Role = {
    id: dbRole.id,
    name: dbRole.name,
    description: dbRole.description ?? undefined,
    createdAt: dbRole.createdAt,
    updatedAt: dbRole.updatedAt,
  };

  if (dbRole._count) {
    return {
      ...base,
      teamMemberCount: dbRole._count.teamMembers,
      rateCardCount: dbRole._count.rateCards,
    };
  }

  return base;
}

// ============================================================================
// DATA ACCESS FUNCTIONS
// ============================================================================

/**
 * Get all roles from the database
 */
export async function getAllRoles(): Promise<RoleWithUsage[]> {
  const roles = await prisma.role.findMany({
    include: {
      _count: {
        select: {
          teamMembers: true,
          rateCards: true,
        },
      },
    },
    orderBy: [{ name: 'asc' }],
  });

  return roles.map(transformRole) as RoleWithUsage[];
}

/**
 * Get roles with optional filtering and pagination
 */
export async function getRoles(options?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ roles: RoleWithUsage[]; total: number }> {
  const where: {
    OR?: Array<{ name: { contains: string; mode: 'insensitive' } } | { description: { contains: string; mode: 'insensitive' } }>;
  } = {};

  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where,
      include: {
        _count: {
          select: {
            teamMembers: true,
            rateCards: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }],
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.role.count({ where }),
  ]);

  return {
    roles: roles.map(transformRole) as RoleWithUsage[],
    total,
  };
}

/**
 * Get a role by ID
 */
export async function getRoleById(id: string): Promise<RoleWithUsage | null> {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          teamMembers: true,
          rateCards: true,
        },
      },
    },
  });

  return role ? (transformRole(role) as RoleWithUsage) : null;
}

/**
 * Get a role by name
 */
export async function getRoleByName(name: string): Promise<Role | null> {
  const role = await prisma.role.findUnique({
    where: { name },
  });

  return role ? (transformRole(role) as Role) : null;
}

/**
 * Create a new role
 */
export async function createRole(input: CreateRoleInput): Promise<RoleWithUsage> {
  // Check if role with same name already exists
  const existing = await prisma.role.findUnique({
    where: { name: input.name },
  });

  if (existing) {
    throw new Error(`A role with the name "${input.name}" already exists`);
  }

  const role = await prisma.role.create({
    data: {
      name: input.name,
      description: input.description ?? null,
    },
    include: {
      _count: {
        select: {
          teamMembers: true,
          rateCards: true,
        },
      },
    },
  });

  return transformRole(role) as RoleWithUsage;
}

/**
 * Update an existing role
 */
export async function updateRole(
  id: string,
  input: UpdateRoleInput
): Promise<RoleWithUsage | null> {
  // Check if role exists
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  // If updating name, check for duplicates
  if (input.name && input.name !== existing.name) {
    const duplicate = await prisma.role.findUnique({
      where: { name: input.name },
    });
    if (duplicate) {
      throw new Error(`A role with the name "${input.name}" already exists`);
    }
  }

  const role = await prisma.role.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
    },
    include: {
      _count: {
        select: {
          teamMembers: true,
          rateCards: true,
        },
      },
    },
  });

  return transformRole(role) as RoleWithUsage;
}

/**
 * Delete a role by ID
 * Note: This will fail if the role is referenced by team members or rate cards
 * due to the onDelete: Restrict constraint in the schema
 */
export async function deleteRole(id: string): Promise<boolean> {
  try {
    // Check for dependencies before deleting
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teamMembers: true,
            rateCards: true,
          },
        },
      },
    });

    if (!role) {
      return false;
    }

    if (role._count.teamMembers > 0 || role._count.rateCards > 0) {
      throw new Error(
        `Cannot delete role "${role.name}" because it is being used by ${role._count.teamMembers} team member(s) and ${role._count.rateCards} rate card(s)`
      );
    }

    await prisma.role.delete({ where: { id } });
    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    return false;
  }
}

/**
 * Check if a role exists
 */
export async function roleExists(id: string): Promise<boolean> {
  const count = await prisma.role.count({ where: { id } });
  return count > 0;
}

/**
 * Get role statistics
 */
export async function getRoleStats(): Promise<{
  totalRoles: number;
  rolesWithTeamMembers: number;
  rolesWithRateCards: number;
  unusedRoles: number;
}> {
  const roles = await prisma.role.findMany({
    include: {
      _count: {
        select: {
          teamMembers: true,
          rateCards: true,
        },
      },
    },
  });

  const total = roles.length;
  const rolesWithTeamMembers = roles.filter((r) => r._count.teamMembers > 0).length;
  const rolesWithRateCards = roles.filter((r) => r._count.rateCards > 0).length;
  const unusedRoles = roles.filter(
    (r) => r._count.teamMembers === 0 && r._count.rateCards === 0
  ).length;

  return {
    totalRoles: total,
    rolesWithTeamMembers,
    rolesWithRateCards,
    unusedRoles,
  };
}
