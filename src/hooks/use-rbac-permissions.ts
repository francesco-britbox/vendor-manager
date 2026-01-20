'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import type { UserEffectivePermissions } from '@/types';

interface UseRBACPermissionsResult {
  /** User's effective permissions */
  permissions: UserEffectivePermissions | null;
  /** Whether permissions are still loading */
  isLoading: boolean;
  /** Error if any */
  error: string | null;
  /** Check if user can access a specific resource */
  canAccess: (resourceKey: string) => boolean;
  /** Check if user can access a specific page path */
  canAccessPage: (path: string) => boolean;
  /** Whether user is a super user */
  isSuperUser: boolean;
  /** Refetch permissions */
  refetch: () => Promise<void>;
}

/**
 * Hook for checking RBAC permissions
 *
 * @example
 * const { canAccess, isSuperUser, isLoading } = useRBACPermissions();
 *
 * if (canAccess('page:analytics')) {
 *   // Show analytics link
 * }
 */
export function useRBACPermissions(): UseRBACPermissionsResult {
  const { data: session, status } = useSession();
  const [permissions, setPermissions] = React.useState<UserEffectivePermissions | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPermissions = React.useCallback(async () => {
    if (!session?.user) {
      setPermissions(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/access-control/check');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch permissions');
      }

      setPermissions(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
      // On error, assume basic access based on session
      setPermissions({
        userId: session.user.id,
        isSuperUser: session.user.isSuperUser,
        groupIds: [],
        accessibleResources: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [session?.user]);

  React.useEffect(() => {
    if (status === 'authenticated') {
      fetchPermissions();
    } else if (status === 'unauthenticated') {
      setPermissions(null);
      setIsLoading(false);
    }
  }, [status, fetchPermissions]);

  const isSuperUser = React.useMemo(() => {
    return session?.user?.isSuperUser || permissions?.isSuperUser || false;
  }, [session?.user?.isSuperUser, permissions?.isSuperUser]);

  const canAccess = React.useCallback(
    (resourceKey: string): boolean => {
      // Super users can access everything
      if (isSuperUser) return true;

      // If permissions haven't loaded yet, be conservative
      if (!permissions) return false;

      // Check if resource is in accessible list
      return permissions.accessibleResources.includes(resourceKey);
    },
    [permissions, isSuperUser]
  );

  const canAccessPage = React.useCallback(
    (path: string): boolean => {
      // Super users can access everything
      if (isSuperUser) return true;

      // Convert path to resource key format
      const resourceKey = `page:${path.replace(/^\//, '').replace(/\//g, '-')}`;
      return canAccess(resourceKey);
    },
    [canAccess, isSuperUser]
  );

  return {
    permissions,
    isLoading: isLoading || status === 'loading',
    error,
    canAccess,
    canAccessPage,
    isSuperUser,
    refetch: fetchPermissions,
  };
}
