/**
 * Permission System Utilities
 *
 * This module provides utilities for checking and enforcing permissions
 * across the application. It implements a hierarchical permission model:
 *
 * Permission Levels (from lowest to highest):
 * - denied: No access at all
 * - view: Can only view data (read-only)
 * - write: Can view and modify data
 * - admin: Full access including administrative functions
 */

import type { PermissionLevel } from "@/types";

/**
 * Permission level hierarchy (numeric values for comparison)
 * Higher number = more permissions
 */
export const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  denied: 0,
  view: 1,
  write: 2,
  admin: 3,
};

/**
 * Human-readable labels for permission levels
 */
export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  denied: "Denied",
  view: "View Only",
  write: "View & Write",
  admin: "Admin",
};

/**
 * Permission level descriptions
 */
export const PERMISSION_DESCRIPTIONS: Record<PermissionLevel, string> = {
  denied: "No access to the system",
  view: "Can view data but cannot make any changes",
  write: "Can view and modify data",
  admin: "Full access including user management and system settings",
};

/**
 * Check if a user has at least a certain permission level
 *
 * @param userLevel - The user's current permission level
 * @param requiredLevel - The minimum required permission level
 * @returns true if user has sufficient permissions
 *
 * @example
 * hasPermission("write", "view") // true - write > view
 * hasPermission("view", "write") // false - view < write
 * hasPermission("admin", "admin") // true - exact match
 */
export function hasPermission(
  userLevel: PermissionLevel,
  requiredLevel: PermissionLevel
): boolean {
  return PERMISSION_HIERARCHY[userLevel] >= PERMISSION_HIERARCHY[requiredLevel];
}

/**
 * Check if user can view data (view level or higher)
 */
export function canView(userLevel: PermissionLevel): boolean {
  return hasPermission(userLevel, "view");
}

/**
 * Check if user can modify data (write level or higher)
 */
export function canWrite(userLevel: PermissionLevel): boolean {
  return hasPermission(userLevel, "write");
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(userLevel: PermissionLevel): boolean {
  return hasPermission(userLevel, "admin");
}

/**
 * Check if user is denied access
 */
export function isDenied(userLevel: PermissionLevel): boolean {
  return userLevel === "denied";
}

/**
 * Get the minimum permission level required for a specific action type
 */
export type ActionType =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "manage_users"
  | "manage_settings";

export const ACTION_PERMISSIONS: Record<ActionType, PermissionLevel> = {
  read: "view",
  create: "write",
  update: "write",
  delete: "write",
  manage_users: "admin",
  manage_settings: "admin",
};

/**
 * Check if a user can perform a specific action
 *
 * @example
 * canPerformAction("view", "read") // true
 * canPerformAction("view", "create") // false
 * canPerformAction("admin", "manage_users") // true
 */
export function canPerformAction(
  userLevel: PermissionLevel,
  action: ActionType
): boolean {
  const requiredLevel = ACTION_PERMISSIONS[action];
  return hasPermission(userLevel, requiredLevel);
}

/**
 * Route permission configuration type
 */
export interface RoutePermission {
  path: string;
  methods?: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
  requiredLevel: PermissionLevel;
}

/**
 * Default route permissions for the application
 * Routes not listed here inherit the default permission (view)
 */
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Admin-only routes
  { path: "/api/users", methods: ["POST", "PUT", "DELETE"], requiredLevel: "admin" },
  { path: "/settings/users", requiredLevel: "admin" },
  { path: "/settings/configuration", requiredLevel: "admin" },
  { path: "/api/settings", requiredLevel: "admin" },

  // Write-required routes (creating/updating data)
  { path: "/api/vendors", methods: ["POST", "PUT", "DELETE"], requiredLevel: "write" },
  { path: "/api/contracts", methods: ["POST", "PUT", "DELETE"], requiredLevel: "write" },
  { path: "/api/invoices", methods: ["POST", "PUT", "DELETE"], requiredLevel: "write" },
  { path: "/api/team-members", methods: ["POST", "PUT", "DELETE"], requiredLevel: "write" },
  { path: "/api/exchange-rates", methods: ["POST", "PUT", "DELETE"], requiredLevel: "write" },
  { path: "/api/roles", methods: ["POST", "PUT", "DELETE"], requiredLevel: "write" },

  // View-only routes (reading data) - default permission
  { path: "/dashboard", requiredLevel: "view" },
  { path: "/api/vendors", methods: ["GET"], requiredLevel: "view" },
  { path: "/api/contracts", methods: ["GET"], requiredLevel: "view" },
  { path: "/api/invoices", methods: ["GET"], requiredLevel: "view" },
  { path: "/api/team-members", methods: ["GET"], requiredLevel: "view" },
  { path: "/api/exchange-rates", methods: ["GET"], requiredLevel: "view" },
  { path: "/api/roles", methods: ["GET"], requiredLevel: "view" },
  { path: "/settings/roles", requiredLevel: "view" },
];

/**
 * Get the required permission level for a route and method
 *
 * @param pathname - The route pathname
 * @param method - The HTTP method (defaults to GET)
 * @returns The required permission level (defaults to "view" if not found)
 */
export function getRoutePermission(
  pathname: string,
  method: string = "GET"
): PermissionLevel {
  // Find matching route permission
  const matchingRoute = ROUTE_PERMISSIONS.find((route) => {
    // Check if path matches (exact match or starts with route path)
    const pathMatches =
      pathname === route.path || pathname.startsWith(route.path + "/");

    // Check if method matches (if specified)
    const methodMatches =
      !route.methods ||
      route.methods.includes(method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE");

    return pathMatches && methodMatches;
  });

  return matchingRoute?.requiredLevel ?? "view";
}

/**
 * Check if a user has permission to access a route
 *
 * @param userLevel - The user's permission level
 * @param pathname - The route pathname
 * @param method - The HTTP method
 * @returns true if access is allowed
 */
export function canAccessRoute(
  userLevel: PermissionLevel,
  pathname: string,
  method: string = "GET"
): boolean {
  const requiredLevel = getRoutePermission(pathname, method);
  return hasPermission(userLevel, requiredLevel);
}

/**
 * Permission check result type
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredLevel?: PermissionLevel;
}

/**
 * Perform a detailed permission check
 *
 * @param userLevel - The user's permission level
 * @param requiredLevel - The required permission level
 * @returns Detailed result including reason if denied
 */
export function checkPermission(
  userLevel: PermissionLevel,
  requiredLevel: PermissionLevel
): PermissionCheckResult {
  if (isDenied(userLevel)) {
    return {
      allowed: false,
      reason: "Your account has been denied access to this system.",
      requiredLevel,
    };
  }

  if (!hasPermission(userLevel, requiredLevel)) {
    return {
      allowed: false,
      reason: `This action requires "${PERMISSION_LABELS[requiredLevel]}" permission. You have "${PERMISSION_LABELS[userLevel]}" permission.`,
      requiredLevel,
    };
  }

  return { allowed: true };
}

/**
 * Get all permission levels as an array (useful for dropdowns)
 */
export function getAllPermissionLevels(): Array<{
  value: PermissionLevel;
  label: string;
  description: string;
}> {
  return (Object.keys(PERMISSION_HIERARCHY) as PermissionLevel[]).map(
    (level) => ({
      value: level,
      label: PERMISSION_LABELS[level],
      description: PERMISSION_DESCRIPTIONS[level],
    })
  );
}
