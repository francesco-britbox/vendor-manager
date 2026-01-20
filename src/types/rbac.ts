/**
 * Role-Based Access Control (RBAC) Types
 *
 * This module defines types for the group-based permission system
 * that enables granular access control to pages and components.
 */

import type { BaseEntity } from './index';

// ============================================================================
// RESOURCE TYPES
// ============================================================================

/** Type of protectable resource */
export type ResourceType = 'page' | 'component';

/** A protectable resource (page or component) */
export interface ProtectableResource extends BaseEntity {
  resourceKey: string;
  type: ResourceType;
  name: string;
  description?: string;
  parentKey?: string; // For components, the parent page's resourceKey
  path?: string; // For pages, the route path
  sortOrder: number;
  isActive: boolean;
  permissions?: ResourcePermission[];
}

/** Resource permission assignment */
export interface ResourcePermission {
  id: string;
  resourceId: string;
  groupId: string;
  createdAt: Date;
  group?: PermissionGroup;
  resource?: ProtectableResource;
}

// ============================================================================
// GROUP TYPES
// ============================================================================

/** Permission group for organizing users */
export interface PermissionGroup extends BaseEntity {
  name: string;
  description?: string;
  isSystem: boolean; // System groups cannot be deleted
  users?: UserGroupMembership[];
  resourcePermissions?: ResourcePermission[];
  memberCount?: number;
  permissionCount?: number;
}

/** User-Group membership */
export interface UserGroupMembership {
  userId: string;
  groupId: string;
  createdAt: Date;
  user?: UserWithGroups;
  group?: PermissionGroup;
}

// ============================================================================
// USER TYPES (RBAC-EXTENDED)
// ============================================================================

/** User with group memberships */
export interface UserWithGroups {
  id: string;
  email: string;
  name: string;
  permissionLevel: string;
  isActive: boolean;
  isSuperUser: boolean;
  createdAt: Date;
  updatedAt: Date;
  groups?: UserGroupMembership[];
}

/** User for management UI */
export interface UserForManagement {
  id: string;
  email: string;
  name: string;
  permissionLevel: string;
  isActive: boolean;
  isSuperUser: boolean;
  createdAt: Date;
  updatedAt: Date;
  groups: Array<{
    id: string;
    name: string;
  }>;
}

/** User creation/update input */
export interface UserInput {
  email: string;
  name: string;
  password?: string;
  permissionLevel?: string;
  isActive?: boolean;
  isSuperUser?: boolean;
  groupIds?: string[];
}

// ============================================================================
// GROUP MANAGEMENT TYPES
// ============================================================================

/** Group creation/update input */
export interface GroupInput {
  name: string;
  description?: string;
}

/** Group with member and permission counts */
export interface GroupWithCounts extends PermissionGroup {
  memberCount: number;
  permissionCount: number;
}

// ============================================================================
// PERMISSION ASSIGNMENT TYPES
// ============================================================================

/** Permission assignment input */
export interface PermissionAssignmentInput {
  resourceId: string;
  groupIds: string[];
}

/** Bulk permission assignment input */
export interface BulkPermissionAssignmentInput {
  assignments: PermissionAssignmentInput[];
}

/** Resource with assigned groups */
export interface ResourceWithPermissions extends ProtectableResource {
  assignedGroups: Array<{
    id: string;
    name: string;
  }>;
}

// ============================================================================
// PERMISSION CHECK TYPES
// ============================================================================

/** Result of a resource permission check */
export interface ResourcePermissionCheck {
  allowed: boolean;
  reason?: string;
  resourceKey: string;
  resourceType: ResourceType;
}

/** User's effective permissions */
export interface UserEffectivePermissions {
  userId: string;
  isSuperUser: boolean;
  groupIds: string[];
  accessibleResources: string[]; // Resource keys the user can access
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/** Response for users list endpoint */
export interface UsersListResponse {
  users: UserForManagement[];
  total: number;
}

/** Response for groups list endpoint */
export interface GroupsListResponse {
  groups: GroupWithCounts[];
  total: number;
}

/** Response for resources list endpoint */
export interface ResourcesListResponse {
  resources: ResourceWithPermissions[];
  total: number;
}

// ============================================================================
// PREDEFINED RESOURCES REGISTRY
// ============================================================================

/** Static resource definition for code-based registration */
export interface StaticResourceDefinition {
  resourceKey: string;
  type: ResourceType;
  name: string;
  description: string;
  parentKey?: string;
  path?: string;
  sortOrder: number;
}

/** Initial protectable pages */
export const PROTECTABLE_PAGES: StaticResourceDefinition[] = [
  {
    resourceKey: 'page:dashboard',
    type: 'page',
    name: 'Dashboard',
    description: 'Main dashboard with overview metrics',
    path: '/dashboard',
    sortOrder: 1,
  },
  {
    resourceKey: 'page:vendors',
    type: 'page',
    name: 'Vendors',
    description: 'Vendor management and listing',
    path: '/vendors',
    sortOrder: 2,
  },
  {
    resourceKey: 'page:team-members',
    type: 'page',
    name: 'Team Members',
    description: 'Team member management',
    path: '/team-members',
    sortOrder: 3,
  },
  {
    resourceKey: 'page:timesheet',
    type: 'page',
    name: 'Timesheet',
    description: 'Timesheet entries and tracking',
    path: '/timesheet',
    sortOrder: 4,
  },
  {
    resourceKey: 'page:invoices',
    type: 'page',
    name: 'Invoices',
    description: 'Invoice management and validation',
    path: '/invoices',
    sortOrder: 5,
  },
  {
    resourceKey: 'page:contracts',
    type: 'page',
    name: 'Contracts',
    description: 'Contract management',
    path: '/contracts',
    sortOrder: 6,
  },
  {
    resourceKey: 'page:analytics',
    type: 'page',
    name: 'Analytics',
    description: 'Analytics and insights',
    path: '/analytics',
    sortOrder: 7,
  },
  {
    resourceKey: 'page:reports',
    type: 'page',
    name: 'Reports',
    description: 'Report generation and viewing',
    path: '/reports',
    sortOrder: 8,
  },
  {
    resourceKey: 'page:settings',
    type: 'page',
    name: 'Settings',
    description: 'System settings and configuration',
    path: '/settings',
    sortOrder: 9,
  },
  {
    resourceKey: 'page:settings-roles',
    type: 'page',
    name: 'Settings - Roles',
    description: 'Job role definitions',
    path: '/settings/roles',
    parentKey: 'page:settings',
    sortOrder: 10,
  },
  {
    resourceKey: 'page:settings-rate-cards',
    type: 'page',
    name: 'Settings - Rate Cards',
    description: 'Vendor pricing templates',
    path: '/settings/rate-cards',
    parentKey: 'page:settings',
    sortOrder: 11,
  },
  {
    resourceKey: 'page:settings-exchange-rates',
    type: 'page',
    name: 'Settings - Exchange Rates',
    description: 'Currency exchange rates',
    path: '/settings/exchange-rates',
    parentKey: 'page:settings',
    sortOrder: 12,
  },
  {
    resourceKey: 'page:settings-configuration',
    type: 'page',
    name: 'Settings - Configuration',
    description: 'System-wide configuration',
    path: '/settings/configuration',
    parentKey: 'page:settings',
    sortOrder: 13,
  },
  {
    resourceKey: 'page:settings-access-control',
    type: 'page',
    name: 'Settings - Access Control',
    description: 'User and group management, permissions',
    path: '/settings/access-control',
    parentKey: 'page:settings',
    sortOrder: 14,
  },
];

/** Initial protectable components */
export const PROTECTABLE_COMPONENTS: StaticResourceDefinition[] = [
  {
    resourceKey: 'component:vendor-documents',
    type: 'component',
    name: 'Vendor Documents',
    description: 'Documents section on vendor detail page',
    parentKey: 'page:vendors',
    sortOrder: 1,
  },
  {
    resourceKey: 'component:vendor-contract-period',
    type: 'component',
    name: 'Vendor Contract Period',
    description: 'Contract period section on vendor detail page',
    parentKey: 'page:vendors',
    sortOrder: 2,
  },
  {
    resourceKey: 'component:vendor-tags',
    type: 'component',
    name: 'Vendor Tags',
    description: 'Tags section on vendor detail page',
    parentKey: 'page:vendors',
    sortOrder: 3,
  },
];

/** All predefined protectable resources */
export const ALL_PROTECTABLE_RESOURCES: StaticResourceDefinition[] = [
  ...PROTECTABLE_PAGES,
  ...PROTECTABLE_COMPONENTS,
];
