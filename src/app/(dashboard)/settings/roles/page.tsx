import { RoleConfig } from '@/components/roles';
import { PageAccessCheck } from '@/components/permissions/page-access-check';

export const metadata = {
  title: 'Roles | Settings',
  description: 'Configure and manage reusable roles for team members and rate cards',
};

// Force dynamic rendering since we need to fetch from database
export const dynamic = 'force-dynamic';

export default async function RolesPage() {
  return (
    <PageAccessCheck resourceKey="page:settings-roles">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Role Management</h2>
          <p className="text-muted-foreground">
            Define and manage reusable roles (Developer, QA, Designer, etc.) that can be assigned to team members and linked to rate cards.
          </p>
        </div>

        <RoleConfig />
      </div>
    </PageAccessCheck>
  );
}
