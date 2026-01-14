"use client";

/**
 * Permission Badge Component
 *
 * Displays the user's permission level as a colored badge.
 */

import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { PermissionLevel } from "@/types";
import { PERMISSION_LABELS } from "@/lib/permissions";

interface PermissionBadgeProps {
  /** Optional permission level to display (defaults to current user's level) */
  level?: PermissionLevel;
  /** Additional className */
  className?: string;
  /** Show only icon variant */
  variant?: "default" | "compact";
}

const BADGE_COLORS: Record<PermissionLevel, string> = {
  denied: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  view: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  write: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

/**
 * Displays a permission level badge with appropriate styling
 *
 * @example
 * // Display current user's permission
 * <PermissionBadge />
 *
 * @example
 * // Display a specific permission level
 * <PermissionBadge level="admin" />
 */
export function PermissionBadge({
  level,
  className,
  variant = "default",
}: PermissionBadgeProps) {
  const { data: session, status } = useSession();

  // Use provided level or get from session
  const permissionLevel =
    level || (session?.user?.permissionLevel as PermissionLevel);

  if (!permissionLevel || (status === "loading" && !level)) {
    return null;
  }

  const label = PERMISSION_LABELS[permissionLevel];
  const colorClass = BADGE_COLORS[permissionLevel];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        variant === "default" ? "px-2.5 py-0.5 text-xs" : "px-1.5 py-0.5 text-[10px]",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}

/**
 * Static badge for displaying permission levels (no session required)
 */
export function StaticPermissionBadge({
  level,
  className,
  variant = "default",
}: Required<Pick<PermissionBadgeProps, "level">> &
  Omit<PermissionBadgeProps, "level">) {
  const label = PERMISSION_LABELS[level];
  const colorClass = BADGE_COLORS[level];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        variant === "default" ? "px-2.5 py-0.5 text-xs" : "px-1.5 py-0.5 text-[10px]",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
