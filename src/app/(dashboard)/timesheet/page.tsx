import { TimesheetManagement } from '@/components/timesheet';
import { PageAccessCheck } from '@/components/permissions';

export const metadata = {
  title: 'Timesheet | Delivery Manager',
  description: 'Enter and manage team member timesheets and track monthly hours',
};

// Force dynamic rendering since we need to fetch from database
export const dynamic = 'force-dynamic';

export default async function TimesheetPage() {
  return (
    <PageAccessCheck resourceKey="page:timesheet">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Timesheet Management</h2>
          <p className="text-muted-foreground">
            Manage monthly timesheets for vendor teams with manual entry, calendar review, and bulk CSV import
          </p>
        </div>

        <TimesheetManagement />
      </div>
    </PageAccessCheck>
  );
}
