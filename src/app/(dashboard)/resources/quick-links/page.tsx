import { QuickLinksManager } from '@/components/quick-links';
import { PageAccessCheck } from '@/components/permissions';
import { auth } from '@/lib/auth';
import { checkResourcePermission } from '@/lib/rbac';

export const metadata = {
  title: 'Quick Links | Delivery Manager',
  description: 'Manage quick links for the dashboard',
};

// Force dynamic rendering since we need to fetch from database
export const dynamic = 'force-dynamic';

export default async function QuickLinksPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const isSuperUser = session?.user?.isSuperUser || false;
  const permissionLevel = session?.user?.permissionLevel || 'view';

  // Check various permissions
  let canCreate = false;
  let canEdit = false;
  let canDelete = false;
  let canManageCategories = false;

  if (userId) {
    // Super users and admins have full access
    if (isSuperUser || permissionLevel === 'admin') {
      canCreate = true;
      canEdit = true;
      canDelete = true;
      canManageCategories = true;
    } else if (permissionLevel === 'write') {
      // Write permission allows creating links
      const createPermission = await checkResourcePermission(
        userId,
        'component:quick-links-create'
      );
      canCreate = createPermission.allowed;
    }

    // Check individual component permissions
    if (!canEdit) {
      const editPermission = await checkResourcePermission(
        userId,
        'component:quick-links-edit'
      );
      canEdit = editPermission.allowed;
    }

    if (!canDelete) {
      const deletePermission = await checkResourcePermission(
        userId,
        'component:quick-links-delete'
      );
      canDelete = deletePermission.allowed;
    }

    if (!canManageCategories) {
      const categoriesPermission = await checkResourcePermission(
        userId,
        'component:quick-links-categories'
      );
      canManageCategories = categoriesPermission.allowed;
    }
  }

  return (
    <PageAccessCheck resourceKey="page:quick-links">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Quick Links</h2>
          <p className="text-muted-foreground">
            Manage frequently used links and resources that appear on the dashboard
          </p>
        </div>

        <QuickLinksManager
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          canManageCategories={canManageCategories}
        />
      </div>
    </PageAccessCheck>
  );
}
