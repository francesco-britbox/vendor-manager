import { Metadata } from 'next';
import { ReportsDashboard } from '@/components/reports/reports-dashboard';
import { PageAccessCheck } from '@/components/permissions';

export const metadata: Metadata = {
  title: 'Reports',
  description: 'Generate and export reports for vendor spend, team utilization, timesheets, time-off, invoice validation, and contract status.',
};

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  return (
    <PageAccessCheck resourceKey="page:reports">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Generate and export reports for vendor spend, team utilization, timesheets, time-off, invoice validation, and contract status.
          </p>
        </div>
        <ReportsDashboard />
      </div>
    </PageAccessCheck>
  );
}
