/**
 * API Route Permission Helpers
 *
 * This module provides utilities for checking permissions in API routes.
 * Use these helpers to protect API endpoints based on user permission levels.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  canPerformAction,
  checkPermission,
  type ActionType,
  PERMISSION_LABELS,
} from "@/lib/permissions";
import type { PermissionLevel, ApiResponse } from "@/types";
import type { Session } from "next-auth";

/**
 * Options for permission checking
 */
export interface PermissionCheckOptions {
  /** The minimum required permission level */
  requiredLevel?: PermissionLevel;
  /** The action type being performed */
  action?: ActionType;
  /** Custom error message */
  errorMessage?: string;
}

/**
 * Result of getting the authenticated session
 */
export interface AuthResult {
  session: Session;
  user: Session["user"];
  permissionLevel: PermissionLevel;
}

/**
 * Get the authenticated session and user
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(): Promise<AuthResult | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return {
    session,
    user: session.user,
    permissionLevel: session.user.permissionLevel as PermissionLevel,
  };
}

/**
 * Create an unauthorized response (401)
 */
export function unauthorizedResponse(
  message: string = "Authentication required"
): NextResponse {
  return NextResponse.json<ApiResponse<null>>(
    {
      success: false,
      error: message,
    },
    { status: 401 }
  );
}

/**
 * Create a forbidden response (403)
 */
export function forbiddenResponse(
  message: string = "Insufficient permissions"
): NextResponse {
  return NextResponse.json<ApiResponse<null>>(
    {
      success: false,
      error: message,
    },
    { status: 403 }
  );
}

/**
 * Check if the current user has the required permission
 * Returns the user data if allowed, or a NextResponse error if not
 *
 * @example
 * const result = await requirePermission({ requiredLevel: "write" });
 * if (result instanceof NextResponse) return result; // Error response
 * // result is AuthResult with user data
 */
export async function requirePermission(
  options: PermissionCheckOptions = {}
): Promise<AuthResult | NextResponse> {
  const authResult = await getAuthenticatedUser();

  // Check authentication
  if (!authResult) {
    return unauthorizedResponse();
  }

  const { permissionLevel } = authResult;
  const { requiredLevel, action, errorMessage } = options;

  // Check by action type
  if (action) {
    if (!canPerformAction(permissionLevel, action)) {
      const defaultMessage = `You don't have permission to perform this action. Action: ${action}`;
      return forbiddenResponse(errorMessage || defaultMessage);
    }
    return authResult;
  }

  // Check by required level
  if (requiredLevel) {
    const check = checkPermission(permissionLevel, requiredLevel);
    if (!check.allowed) {
      return forbiddenResponse(errorMessage || check.reason);
    }
  }

  return authResult;
}

/**
 * Require view permission (read-only access)
 */
export async function requireViewPermission(): Promise<
  AuthResult | NextResponse
> {
  return requirePermission({ action: "read" });
}

/**
 * Require write permission (create, update, delete)
 */
export async function requireWritePermission(): Promise<
  AuthResult | NextResponse
> {
  return requirePermission({ requiredLevel: "write" });
}

/**
 * Require admin permission
 */
export async function requireAdminPermission(): Promise<
  AuthResult | NextResponse
> {
  return requirePermission({ requiredLevel: "admin" });
}

/**
 * Create a higher-order function that wraps an API handler with permission checking
 * Useful for applying consistent permission checks across handlers
 *
 * @example
 * export const GET = withPermission({ action: "read" }, async (request, authResult) => {
 *   // Handler logic with guaranteed authResult
 *   return NextResponse.json({ success: true, data: ... });
 * });
 */
export function withPermission<T extends unknown[]>(
  options: PermissionCheckOptions,
  handler: (
    request: Request,
    authResult: AuthResult,
    ...args: T
  ) => Promise<NextResponse>
) {
  return async (request: Request, ...args: T): Promise<NextResponse> => {
    const result = await requirePermission(options);

    if (result instanceof NextResponse) {
      return result;
    }

    return handler(request, result, ...args);
  };
}

/**
 * Wrapper for read-only API handlers
 */
export function withReadPermission<T extends unknown[]>(
  handler: (
    request: Request,
    authResult: AuthResult,
    ...args: T
  ) => Promise<NextResponse>
) {
  return withPermission({ action: "read" }, handler);
}

/**
 * Wrapper for write API handlers
 */
export function withWritePermission<T extends unknown[]>(
  handler: (
    request: Request,
    authResult: AuthResult,
    ...args: T
  ) => Promise<NextResponse>
) {
  return withPermission({ requiredLevel: "write" }, handler);
}

/**
 * Wrapper for admin-only API handlers
 */
export function withAdminPermission<T extends unknown[]>(
  handler: (
    request: Request,
    authResult: AuthResult,
    ...args: T
  ) => Promise<NextResponse>
) {
  return withPermission({ requiredLevel: "admin" }, handler);
}

/**
 * Type guard to check if a result is an error response
 */
export function isErrorResponse(
  result: AuthResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Get a formatted permission error message
 */
export function getPermissionErrorMessage(
  userLevel: PermissionLevel,
  requiredLevel: PermissionLevel
): string {
  return `Insufficient permissions. Required: ${PERMISSION_LABELS[requiredLevel]}, Your level: ${PERMISSION_LABELS[userLevel]}`;
}
