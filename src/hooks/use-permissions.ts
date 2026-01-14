"use client";

/**
 * usePermissions Hook
 *
 * A React hook that provides access to the current user's permissions
 * and helper functions for checking permissions in components.
 */

import { useSession } from "next-auth/react";
import { useMemo } from "react";
import type { PermissionLevel } from "@/types";
import {
  hasPermission,
  canPerformAction,
  isAdmin,
  canView,
  canWrite,
  isDenied,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
  type ActionType,
} from "@/lib/permissions";

export interface UsePermissionsResult {
  /** The user's current permission level */
  permissionLevel: PermissionLevel | null;
  /** Human-readable label for the permission level */
  permissionLabel: string | null;
  /** Description of the permission level */
  permissionDescription: string | null;
  /** Whether the session is still loading */
  isLoading: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Check if user has at least the specified permission level */
  hasPermission: (requiredLevel: PermissionLevel) => boolean;
  /** Check if user can perform a specific action */
  canPerformAction: (action: ActionType) => boolean;
  /** Whether user can view data */
  canView: boolean;
  /** Whether user can write data */
  canWrite: boolean;
  /** Whether user is an admin */
  isAdmin: boolean;
  /** Whether user is denied access */
  isDenied: boolean;
}

/**
 * Hook for checking user permissions in React components
 *
 * @example
 * function MyComponent() {
 *   const { canWrite, isAdmin, hasPermission } = usePermissions();
 *
 *   return (
 *     <div>
 *       {canWrite && <EditButton />}
 *       {isAdmin && <AdminPanel />}
 *       {hasPermission("write") && <CreateButton />}
 *     </div>
 *   );
 * }
 */
export function usePermissions(): UsePermissionsResult {
  const { data: session, status } = useSession();

  const result = useMemo(() => {
    const isLoading = status === "loading";
    const isAuthenticated = !!session?.user;
    const permissionLevel =
      (session?.user?.permissionLevel as PermissionLevel) || null;

    // Helper functions that handle null permission level
    const checkHasPermission = (requiredLevel: PermissionLevel): boolean => {
      if (!permissionLevel) return false;
      return hasPermission(permissionLevel, requiredLevel);
    };

    const checkCanPerformAction = (action: ActionType): boolean => {
      if (!permissionLevel) return false;
      return canPerformAction(permissionLevel, action);
    };

    return {
      permissionLevel,
      permissionLabel: permissionLevel
        ? PERMISSION_LABELS[permissionLevel]
        : null,
      permissionDescription: permissionLevel
        ? PERMISSION_DESCRIPTIONS[permissionLevel]
        : null,
      isLoading,
      isAuthenticated,
      hasPermission: checkHasPermission,
      canPerformAction: checkCanPerformAction,
      canView: permissionLevel ? canView(permissionLevel) : false,
      canWrite: permissionLevel ? canWrite(permissionLevel) : false,
      isAdmin: permissionLevel ? isAdmin(permissionLevel) : false,
      isDenied: permissionLevel ? isDenied(permissionLevel) : false,
    };
  }, [session, status]);

  return result;
}

/**
 * Hook that returns only the loading state
 * Useful for components that only need to know if permissions are loaded
 */
export function usePermissionsLoaded(): boolean {
  const { status } = useSession();
  return status !== "loading";
}

/**
 * Hook that returns true if user can perform the specified action
 */
export function useCanPerformAction(action: ActionType): boolean {
  const { canPerformAction } = usePermissions();
  return canPerformAction(action);
}

/**
 * Hook that returns true if user has at least the specified permission level
 */
export function useHasPermission(requiredLevel: PermissionLevel): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(requiredLevel);
}
