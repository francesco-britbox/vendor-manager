/**
 * Permission Components
 *
 * Export all permission-related components from a single location.
 */

// Legacy permission level guards (based on permissionLevel field)
export {
  PermissionGuard,
  ViewOnlyGuard,
  WriteGuard,
  AdminGuard,
  ActionGuard,
} from "./permission-guard";

export { PermissionBadge, StaticPermissionBadge } from "./permission-badge";

// RBAC-based guards (based on group memberships)
export {
  RBACGuard,
  SuperUserGuard,
  PageGuard,
  ComponentGuard,
  useMultiplePermissions,
} from "./rbac-guard";

// Server-side page access check
export { PageAccessCheck } from "./page-access-check";
