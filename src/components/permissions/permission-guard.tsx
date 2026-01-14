"use client";

/**
 * Permission Guard Components
 *
 * These components provide declarative permission checking in the UI.
 * They conditionally render children based on the user's permission level.
 */

import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import type { PermissionLevel } from "@/types";
import {
  hasPermission,
  canPerformAction,
  type ActionType,
} from "@/lib/permissions";

interface PermissionGuardProps {
  /** The minimum required permission level */
  requiredLevel?: PermissionLevel;
  /** The action type being performed */
  action?: ActionType;
  /** Content to render if user has permission */
  children: ReactNode;
  /** Optional fallback content if user doesn't have permission */
  fallback?: ReactNode;
}

/**
 * Guard component that conditionally renders based on permission level
 *
 * @example
 * <PermissionGuard requiredLevel="write">
 *   <EditButton />
 * </PermissionGuard>
 *
 * @example
 * <PermissionGuard action="delete" fallback={<span>Cannot delete</span>}>
 *   <DeleteButton />
 * </PermissionGuard>
 */
export function PermissionGuard({
  requiredLevel,
  action,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { data: session, status } = useSession();

  // While loading, don't render anything to prevent flash
  if (status === "loading") {
    return null;
  }

  // Not authenticated
  if (!session?.user) {
    return <>{fallback}</>;
  }

  const userLevel = session.user.permissionLevel as PermissionLevel;

  // Check by action type
  if (action) {
    if (!canPerformAction(userLevel, action)) {
      return <>{fallback}</>;
    }
    return <>{children}</>;
  }

  // Check by required level
  if (requiredLevel) {
    if (!hasPermission(userLevel, requiredLevel)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Guard that renders only for users with view permission or higher
 */
export function ViewOnlyGuard({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard requiredLevel="view" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * Guard that renders only for users with write permission or higher
 */
export function WriteGuard({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard requiredLevel="write" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * Guard that renders only for admin users
 */
export function AdminGuard({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard requiredLevel="admin" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * Guard that renders only for users who can perform a specific action
 */
export function ActionGuard({
  action,
  children,
  fallback,
}: {
  action: ActionType;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGuard action={action} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}
