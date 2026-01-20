import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { checkResourcePermission } from '@/lib/rbac';

interface PageAccessCheckProps {
  /** RBAC resource key for the page (e.g., "page:analytics") */
  resourceKey: string;
  /** Content to render if user has permission */
  children: React.ReactNode;
}

/**
 * Server component that checks RBAC permissions for a page.
 * Redirects to /access-denied if user doesn't have permission.
 *
 * @example
 * // In a page component:
 * export default async function AnalyticsPage() {
 *   return (
 *     <PageAccessCheck resourceKey="page:analytics">
 *       <AnalyticsContent />
 *     </PageAccessCheck>
 *   );
 * }
 */
export async function PageAccessCheck({
  resourceKey,
  children,
}: PageAccessCheckProps) {
  const session = await auth();

  // If not authenticated, middleware should have redirected to login
  // But handle edge case
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Super users always have access
  if (session.user.isSuperUser) {
    return <>{children}</>;
  }

  // Check RBAC permission
  const permissionCheck = await checkResourcePermission(
    session.user.id,
    resourceKey
  );

  if (!permissionCheck.allowed) {
    redirect('/access-denied');
  }

  return <>{children}</>;
}
