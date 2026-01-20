/**
 * Role-Based Access Control (RBAC) Service
 *
 * This module provides the core functionality for the RBAC system:
 * - Resource registration and management
 * - Permission checking
 * - Group and user permission aggregation
 */

import { prisma } from '@/lib/prisma';
import type {
  ProtectableResource,
  ResourcePermissionCheck,
  UserEffectivePermissions,
  StaticResourceDefinition,
  ResourceType,
} from '@/types/rbac';

// ============================================================================
// RESOURCE MANAGEMENT
// ============================================================================

/**
 * Sync static resource definitions to the database
 * This should be called during application startup or migration
 */
export async function syncProtectableResources(
  resources: StaticResourceDefinition[]
): Promise<void> {
  for (const resource of resources) {
    await prisma.protectableResource.upsert({
      where: { resourceKey: resource.resourceKey },
      create: {
        resourceKey: resource.resourceKey,
        type: resource.type,
        name: resource.name,
        description: resource.description || null,
        parentKey: resource.parentKey || null,
        path: resource.path || null,
        sortOrder: resource.sortOrder,
        isActive: true,
      },
      update: {
        type: resource.type,
        name: resource.name,
        description: resource.description || null,
        parentKey: resource.parentKey || null,
        path: resource.path || null,
        sortOrder: resource.sortOrder,
      },
    });
  }
}

/**
 * Get all protectable resources with their assigned groups
 */
export async function getProtectableResources(): Promise<ProtectableResource[]> {
  const resources = await prisma.protectableResource.findMany({
    where: { isActive: true },
    include: {
      permissions: {
        include: {
          group: true,
        },
      },
    },
    orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }],
  });

  return resources.map((r) => ({
    id: r.id,
    resourceKey: r.resourceKey,
    type: r.type as ResourceType,
    name: r.name,
    description: r.description || undefined,
    parentKey: r.parentKey || undefined,
    path: r.path || undefined,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    permissions: r.permissions.map((p) => ({
      id: p.id,
      resourceId: p.resourceId,
      groupId: p.groupId,
      createdAt: p.createdAt,
      group: p.group
        ? {
            id: p.group.id,
            name: p.group.name,
            description: p.group.description || undefined,
            isSystem: p.group.isSystem,
            createdAt: p.group.createdAt,
            updatedAt: p.group.updatedAt,
          }
        : undefined,
    })),
  }));
}

/**
 * Get a specific resource by its key
 */
export async function getResourceByKey(
  resourceKey: string
): Promise<ProtectableResource | null> {
  const resource = await prisma.protectableResource.findUnique({
    where: { resourceKey },
    include: {
      permissions: {
        include: {
          group: true,
        },
      },
    },
  });

  if (!resource) return null;

  return {
    id: resource.id,
    resourceKey: resource.resourceKey,
    type: resource.type as ResourceType,
    name: resource.name,
    description: resource.description || undefined,
    parentKey: resource.parentKey || undefined,
    path: resource.path || undefined,
    sortOrder: resource.sortOrder,
    isActive: resource.isActive,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
    permissions: resource.permissions.map((p) => ({
      id: p.id,
      resourceId: p.resourceId,
      groupId: p.groupId,
      createdAt: p.createdAt,
    })),
  };
}

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Check if a user can access a specific resource
 *
 * Permission resolution logic:
 * 1. Super users always have access
 * 2. If resource has no groups assigned, all authenticated users have access
 * 3. If resource has groups assigned, only users in those groups have access
 */
export async function checkResourcePermission(
  userId: string,
  resourceKey: string
): Promise<ResourcePermissionCheck> {
  // Get user with groups and super user status
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      groups: {
        include: {
          group: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return {
      allowed: false,
      reason: 'User not found or inactive',
      resourceKey,
      resourceType: 'page',
    };
  }

  // Super users have full access
  if (user.isSuperUser) {
    return {
      allowed: true,
      resourceKey,
      resourceType: 'page',
    };
  }

  // Get the resource with its permissions
  const resource = await prisma.protectableResource.findUnique({
    where: { resourceKey },
    include: {
      permissions: true,
    },
  });

  // If resource doesn't exist in DB, allow access (not a protected resource)
  if (!resource) {
    return {
      allowed: true,
      resourceKey,
      resourceType: 'page',
    };
  }

  // If resource has no permissions assigned, allow all authenticated users
  if (resource.permissions.length === 0) {
    return {
      allowed: true,
      resourceKey,
      resourceType: resource.type as ResourceType,
    };
  }

  // Check if user is in any of the allowed groups
  const userGroupIds = user.groups.map((ug) => ug.groupId);
  const allowedGroupIds = resource.permissions.map((p) => p.groupId);

  const hasAccess = userGroupIds.some((gid) => allowedGroupIds.includes(gid));

  return {
    allowed: hasAccess,
    reason: hasAccess ? undefined : 'User is not in any of the allowed groups',
    resourceKey,
    resourceType: resource.type as ResourceType,
  };
}

/**
 * Check if a user can access a page by its path
 */
export async function checkPagePermissionByPath(
  userId: string,
  path: string
): Promise<ResourcePermissionCheck> {
  // Find resource by path
  const resource = await prisma.protectableResource.findFirst({
    where: {
      path: path,
      type: 'page',
      isActive: true,
    },
  });

  // If no resource found for this path, it's not protected
  if (!resource) {
    return {
      allowed: true,
      resourceKey: `page:${path}`,
      resourceType: 'page',
    };
  }

  return checkResourcePermission(userId, resource.resourceKey);
}

/**
 * Get user's effective permissions (all accessible resources)
 */
export async function getUserEffectivePermissions(
  userId: string
): Promise<UserEffectivePermissions | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      groups: {
        include: {
          group: {
            include: {
              resourcePermissions: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const groupIds = user.groups.map((ug) => ug.groupId);

  // If super user, get all resources
  if (user.isSuperUser) {
    const allResources = await prisma.protectableResource.findMany({
      where: { isActive: true },
    });

    return {
      userId,
      isSuperUser: true,
      groupIds,
      accessibleResources: allResources.map((r) => r.resourceKey),
    };
  }

  // Get all resources
  const allResources = await prisma.protectableResource.findMany({
    where: { isActive: true },
    include: {
      permissions: true,
    },
  });

  // Calculate accessible resources
  const accessibleResources: string[] = [];

  for (const resource of allResources) {
    // No permissions = accessible to all
    if (resource.permissions.length === 0) {
      accessibleResources.push(resource.resourceKey);
      continue;
    }

    // Check if user is in any allowed group
    const resourceGroupIds = resource.permissions.map((p) => p.groupId);
    if (groupIds.some((gid) => resourceGroupIds.includes(gid))) {
      accessibleResources.push(resource.resourceKey);
    }
  }

  return {
    userId,
    isSuperUser: false,
    groupIds,
    accessibleResources,
  };
}

/**
 * Get accessible page paths for a user (for navigation filtering)
 */
export async function getAccessiblePagePaths(userId: string): Promise<string[]> {
  const permissions = await getUserEffectivePermissions(userId);

  if (!permissions) return [];

  const resources = await prisma.protectableResource.findMany({
    where: {
      type: 'page',
      isActive: true,
      resourceKey: {
        in: permissions.accessibleResources,
      },
    },
  });

  return resources.filter((r) => r.path).map((r) => r.path!);
}

// ============================================================================
// GROUP MANAGEMENT
// ============================================================================

/**
 * Get all permission groups with member and permission counts
 */
export async function getPermissionGroups() {
  const groups = await prisma.permissionGroup.findMany({
    include: {
      _count: {
        select: {
          users: true,
          resourcePermissions: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description || undefined,
    isSystem: g.isSystem,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    memberCount: g._count.users,
    permissionCount: g._count.resourcePermissions,
  }));
}

/**
 * Create a new permission group
 */
export async function createPermissionGroup(
  name: string,
  description?: string
) {
  return prisma.permissionGroup.create({
    data: {
      name,
      description: description || null,
    },
  });
}

/**
 * Update a permission group
 */
export async function updatePermissionGroup(
  id: string,
  name: string,
  description?: string
) {
  return prisma.permissionGroup.update({
    where: { id },
    data: {
      name,
      description: description || null,
    },
  });
}

/**
 * Delete a permission group (if not a system group)
 */
export async function deletePermissionGroup(id: string) {
  const group = await prisma.permissionGroup.findUnique({
    where: { id },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  if (!group) {
    throw new Error('Group not found');
  }

  if (group.isSystem) {
    throw new Error('Cannot delete system groups');
  }

  return prisma.permissionGroup.delete({
    where: { id },
  });
}

// ============================================================================
// PERMISSION ASSIGNMENT
// ============================================================================

/**
 * Assign groups to a resource (replaces existing assignments)
 */
export async function assignGroupsToResource(
  resourceId: string,
  groupIds: string[]
) {
  // Delete existing assignments
  await prisma.resourcePermission.deleteMany({
    where: { resourceId },
  });

  // Create new assignments
  if (groupIds.length > 0) {
    await prisma.resourcePermission.createMany({
      data: groupIds.map((groupId) => ({
        resourceId,
        groupId,
      })),
    });
  }

  return getResourceByKey(
    (await prisma.protectableResource.findUnique({ where: { id: resourceId } }))
      ?.resourceKey || ''
  );
}

/**
 * Add a group to a resource
 */
export async function addGroupToResource(resourceId: string, groupId: string) {
  return prisma.resourcePermission.upsert({
    where: {
      resourceId_groupId: {
        resourceId,
        groupId,
      },
    },
    create: {
      resourceId,
      groupId,
    },
    update: {},
  });
}

/**
 * Remove a group from a resource
 */
export async function removeGroupFromResource(
  resourceId: string,
  groupId: string
) {
  return prisma.resourcePermission.delete({
    where: {
      resourceId_groupId: {
        resourceId,
        groupId,
      },
    },
  });
}

// ============================================================================
// USER GROUP MANAGEMENT
// ============================================================================

/**
 * Add a user to a group
 */
export async function addUserToGroup(userId: string, groupId: string) {
  return prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
    create: {
      userId,
      groupId,
    },
    update: {},
  });
}

/**
 * Remove a user from a group
 */
export async function removeUserFromGroup(userId: string, groupId: string) {
  return prisma.userGroup.delete({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  });
}

/**
 * Set user's groups (replaces existing memberships)
 */
export async function setUserGroups(userId: string, groupIds: string[]) {
  // Delete existing memberships
  await prisma.userGroup.deleteMany({
    where: { userId },
  });

  // Create new memberships
  if (groupIds.length > 0) {
    await prisma.userGroup.createMany({
      data: groupIds.map((groupId) => ({
        userId,
        groupId,
      })),
    });
  }
}

// ============================================================================
// SUPER USER MANAGEMENT
// ============================================================================

/**
 * Check if there's at least one super user in the system
 */
export async function hasSuperUser(): Promise<boolean> {
  const count = await prisma.user.count({
    where: {
      isSuperUser: true,
      isActive: true,
    },
  });
  return count > 0;
}

/**
 * Get the count of active super users
 */
export async function getSuperUserCount(): Promise<number> {
  return prisma.user.count({
    where: {
      isSuperUser: true,
      isActive: true,
    },
  });
}

/**
 * Check if a user can be demoted from super user status
 * (Prevents demoting the last super user)
 */
export async function canDemoteSuperUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.isSuperUser) {
    return true; // User is not a super user, so "demotion" doesn't apply
  }

  const superUserCount = await getSuperUserCount();
  return superUserCount > 1;
}

// ============================================================================
// INITIAL SETUP
// ============================================================================

/**
 * Initialize the RBAC system with default groups and resources
 */
export async function initializeRBAC(resources: StaticResourceDefinition[]) {
  // Sync protectable resources
  await syncProtectableResources(resources);

  // Create Administrators group if it doesn't exist
  const adminGroup = await prisma.permissionGroup.upsert({
    where: { name: 'Administrators' },
    create: {
      name: 'Administrators',
      description:
        'Full access to settings and user management. Members can manage other users, groups, and system configuration.',
      isSystem: true,
    },
    update: {},
  });

  // Assign Administrators group to Access Control settings page
  const accessControlResource = await prisma.protectableResource.findUnique({
    where: { resourceKey: 'page:settings-access-control' },
  });

  if (accessControlResource) {
    await prisma.resourcePermission.upsert({
      where: {
        resourceId_groupId: {
          resourceId: accessControlResource.id,
          groupId: adminGroup.id,
        },
      },
      create: {
        resourceId: accessControlResource.id,
        groupId: adminGroup.id,
      },
      update: {},
    });
  }

  return { adminGroup };
}
