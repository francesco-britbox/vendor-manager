import { Metadata } from 'next';
import { PageAccessCheck } from '@/components/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { ReportHistoryTable } from '@/components/reporting';

export const metadata: Metadata = {
  title: 'Reporting',
  description: 'View and manage weekly delivery reports',
};

export const dynamic = 'force-dynamic';

export default async function ReportingPage() {
  return (
    <PageAccessCheck resourceKey="page:reporting">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Reporting</h2>
          <p className="text-muted-foreground">
            Manage weekly delivery reports for your assigned vendors
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {/* Create Report Card */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Create Report</CardTitle>
              </div>
              <CardDescription>
                Start a new weekly delivery report for your assigned vendors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reporting/create">
                <Button className="w-full">
                  Create Weekly Report
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="hover:shadow-md transition-shadow md:col-span-1 lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-100">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <CardTitle className="text-lg">Quick Tips</CardTitle>
              </div>
              <CardDescription>
                Get the most out of weekly reporting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 md:flex md:gap-6 md:space-y-0">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Reports auto-save as you type</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Focus items carry over to next week as achievements</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Timeline and RAID data persists across weeks</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Report History Table */}
        <ReportHistoryTable />
      </div>
    </PageAccessCheck>
  );
}
