import { Metadata } from 'next';
import { PageAccessCheck } from '@/components/permissions';
import { ReportForm } from '@/components/reporting';
import { auth } from '@/lib/auth';
import { getAssignedVendors } from '@/lib/reporting';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Create Weekly Report',
  description: 'Create and edit weekly vendor delivery reports',
};

export const dynamic = 'force-dynamic';

export default async function CreateReportPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Build auth context for access checks (admins/superusers see all vendors)
  const authContext = {
    permissionLevel: session.user.permissionLevel,
    isSuperUser: session.user.isSuperUser,
  };

  // Fetch assigned vendors for the current user
  const vendors = await getAssignedVendors(session.user.id, authContext);

  return (
    <PageAccessCheck resourceKey="page:reporting-create">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Weekly Delivery Report</h2>
          <p className="text-muted-foreground">
            Track vendor status, achievements, and planned work for the week
          </p>
        </div>

        <ReportForm initialVendors={vendors} userId={session.user.id} />
      </div>
    </PageAccessCheck>
  );
}
