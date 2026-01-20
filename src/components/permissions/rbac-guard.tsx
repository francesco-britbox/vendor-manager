'use client';

/**
 * RBAC Permission Guard Components
 *
 * These components provide declarative permission checking based on
 * the RBAC (Role-Based Access Control) system with groups.
 */

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useRBACPermissions } from '@/hooks/use-rbac-permissions';

interface RBACGuardProps {
  /** Resource key to check access for (e.g., "page:analytics", "component:vendor-documents") */
  resourceKey: string;
  /** Content to render if user has permission */
  children: React.ReactNode;
  /** Optional fallback content if user doesn't have permission */
  fallback?: React.ReactNode;
  /** Whether to show a loading state while checking permissions */
  showLoading?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

/**
 * Guard component that conditionally renders based on RBAC permissions
 *
 * @example
 * <RBACGuard resourceKey="page:analytics">
 *   <AnalyticsContent />
 * </RBACGuard>
 *
 * @example
 * <RBACGuard
 *   resourceKey="component:vendor-documents"
 *   fallback={<p>You don't have access to documents</p>}
 * >
 *   <VendorDocumentsSection />
 * </RBACGuard>
 */
export function RBACGuard({
  resourceKey,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent = null,
}: RBACGuardProps) {
  const { canAccess, isLoading, isSuperUser } = useRBACPermissions();

  // Show loading state if enabled
  if (isLoading && showLoading) {
    return <>{loadingComponent}</>;
  }

  // While loading (and not showing loading state), don't render anything to prevent flash
  if (isLoading) {
    return null;
  }

  // Super users always have access
  if (isSuperUser) {
    return <>{children}</>;
  }

  // Check if user can access the resource
  if (!canAccess(resourceKey)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Guard that renders only for super users
 */
export function SuperUserGuard({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return null;
  }

  if (!session?.user?.isSuperUser) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Guard component for page-level access control
 */
export function PageGuard({
  path,
  children,
  fallback,
}: {
  /** Page path (e.g., "/analytics", "/settings/configuration") */
  path: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  // Convert path to resource key
  const resourceKey = `page:${path.replace(/^\//, '').replace(/\//g, '-')}`;

  return (
    <RBACGuard resourceKey={resourceKey} fallback={fallback}>
      {children}
    </RBACGuard>
  );
}

/**
 * Guard component for component-level access control
 */
export function ComponentGuard({
  componentKey,
  children,
  fallback,
}: {
  /** Component key (e.g., "vendor-documents", "vendor-contract-period") */
  componentKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const resourceKey = `component:${componentKey}`;

  return (
    <RBACGuard resourceKey={resourceKey} fallback={fallback}>
      {children}
    </RBACGuard>
  );
}

/**
 * Hook to check multiple permissions at once
 */
export function useMultiplePermissions(resourceKeys: string[]): Record<string, boolean> {
  const { canAccess, isSuperUser, isLoading } = useRBACPermissions();

  return React.useMemo(() => {
    if (isLoading) {
      // While loading, assume no access
      return resourceKeys.reduce(
        (acc, key) => ({
          ...acc,
          [key]: false,
        }),
        {}
      );
    }

    // Super users have access to everything
    if (isSuperUser) {
      return resourceKeys.reduce(
        (acc, key) => ({
          ...acc,
          [key]: true,
        }),
        {}
      );
    }

    return resourceKeys.reduce(
      (acc, key) => ({
        ...acc,
        [key]: canAccess(key),
      }),
      {}
    );
  }, [resourceKeys, canAccess, isSuperUser, isLoading]);
}
