import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AnalyticsDashboard } from '@/components/analytics';

export const metadata = {
  title: 'Analytics Dashboard | Presence Manager',
  description: 'Comprehensive analytics dashboard with spend tracking, vendor metrics, and contract insights',
};

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
        <p className="text-muted-foreground">
          Comprehensive insights into vendors, spend, contracts, and invoices
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
